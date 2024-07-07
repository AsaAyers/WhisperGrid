/* eslint-disable @typescript-eslint/no-explicit-any */
import { GridStorage, ThreadID } from "./GridStorage";
import {
  SignedInvitation,
  Invitation,
  SelfEncrypted,
  ReplyMessage,
  SignedReply,
  BackupPayload,
  SignedBackup,
  ReplyToInvite,
  Decrypted,
  SignedSelfEncrypted,
  ReplyToInvitePayload,
  ReplyPayload,
  SignedTransport,
} from "./types";
import {
  generateECDSAKeyPair,
  generateECDHKeyPair,
  exportKeyPair,
  encryptPrivateKey,
  getJWKthumbprint,
  invariant,
  decryptPrivateKey,
  importKeyPair,
  parseJWS,
  deriveSharedSecret,
  signJWS,
  verifyJWS,
  JWK,
  ECDHCryptoKeyPair,
  ECDSACryptoKeyPair,
  exportKey,
  Thumbprint,
  SymmetricKey,
  importPrivateKey,
  importPublicKey,
  decryptData,
  encryptData,
} from "./utils";
import { ArrayBuffertohex } from "jsrsasign";

const keyNicknames = new Map<string, string>();
export function setNickname(key: string, nickname: string) {
  keyNicknames.set(key, nickname);
}

export function getNickname(key: string) {
  return keyNicknames.get(key) + "_" + key.substring(key.length - 6);
}

let messageIdForInviteTesting: string | undefined;
export function setMessageIdForTesting(messageId: string) {
  messageIdForInviteTesting = messageId;
}

const MAX_MESSAGE_ID = Number.MAX_SAFE_INTEGER / 2;

export type DecryptedMessageType = {
  message: string;
  type: "invite" | "message";
  from: string;
  fromThumbprint: Thumbprint<"ECDSA">;
  iat: number;
  messageId: string;
};

export class Client {
  private clientNickname: string = Math.random().toString(36).slice(2);
  async setClientNickname(nickname: string) {
    this.clientNickname = nickname;
    if (nickname) {
      setNickname(this.thumbprint, this.clientNickname!);
      setNickname(
        await getJWKthumbprint(await exportKey(this.storageKeyPair.publicKey)),
        `storage[${this.clientNickname!}]`
      );
    }
  }

  constructor(
    private storage: GridStorage,
    public readonly thumbprint: Thumbprint<"ECDSA">,
    private readonly identityKeyPair: ECDSACryptoKeyPair,
    private readonly storageKeyPair: ECDHCryptoKeyPair
  ) {}

  static async generateClient(
    storage: GridStorage,
    password: string
  ): Promise<Client> {
    const identity = await generateECDSAKeyPair();
    const storageKey = await generateECDHKeyPair();
    const idJWKs = await exportKeyPair(identity);
    const storageJWKs = await exportKeyPair(storageKey);

    const encryptedIdentity = await encryptPrivateKey(
      idJWKs.privateKeyJWK,
      password
    );
    const encryptedStorageKey = await encryptPrivateKey(
      storageJWKs.privateKeyJWK,
      password
    );

    const thumbprint = await getJWKthumbprint(idJWKs.publicKeyJWK);

    storage.setItem(`identity:${thumbprint}`, {
      id: {
        jwk: idJWKs.publicKeyJWK,
        private: encryptedIdentity,
      },
      storage: {
        jwk: storageJWKs.publicKeyJWK,
        private: encryptedStorageKey,
      },
    });

    return Client.loadClient(storage, thumbprint, password);
  }

  static async loadFromBackup(
    storage: GridStorage,
    backup: BackupPayload | SignedBackup,
    password: string
  ): Promise<Client> {
    if (typeof backup === "string") {
      const jws = await parseJWS(backup);
      return Client.loadFromBackup(storage, jws.payload, password);
    }

    const identityPrivateKey = await decryptPrivateKey(
      backup.encryptedIdentity,
      password
    );
    const storagePrivateKey = await decryptPrivateKey(
      backup.encryptedStorageKey,
      password
    );

    const identityKeyPair: ECDSACryptoKeyPair = await importKeyPair(
      {
        privateKeyJWK: identityPrivateKey,
        publicKeyJWK: backup.idJWK,
      },
      "ecdsa"
    );
    const storageKeyPair: ECDHCryptoKeyPair = await importKeyPair(
      {
        privateKeyJWK: storagePrivateKey,
        publicKeyJWK: backup.storageJWK,
      },
      "ecdh"
    );

    storage.setItem(`identity:${backup.thumbprint}`, {
      id: {
        jwk: await exportKey(identityKeyPair.publicKey),
        private: backup.encryptedIdentity,
      },
      storage: {
        jwk: await exportKey(storageKeyPair.publicKey),
        private: backup.encryptedStorageKey,
      },
    });

    for (const invitation of backup.invitations ?? []) {
      const invite = await parseJWS(invitation);
      const thumbprint = await getJWKthumbprint(invite.payload.epk);
      storage.setItem(`invitation:${thumbprint}`, invitation);
      storage.appendItem(`invitations:${backup.thumbprint}`, thumbprint);
    }

    for (const [t, { messages, ...threadInfo }] of Object.entries(
      backup.threads
    )) {
      const threadId = t as ThreadID;
      storage.setItem(`thread-info:${threadId}`, threadInfo);
      storage.appendItem(`threads:${backup.thumbprint}`, threadId);
      storage.setItem(`keyed-messages:${threadId}`, messages);
    }
    const client = new Client(
      storage,
      backup.thumbprint,
      identityKeyPair,
      storageKeyPair
    );
    return client;
  }

  static async loadClient(
    storage: GridStorage,
    thumbprint: Thumbprint<"ECDSA">,
    password: string
  ) {
    const storedData = storage.getItem(`identity:${thumbprint}`);
    invariant(storedData, "No identity found for thumbprint");

    const privateKeyJWK = await decryptPrivateKey(
      storedData.id.private,
      password
    );
    const id = await importKeyPair(
      { privateKeyJWK, publicKeyJWK: storedData.id.jwk },
      "ecdsa"
    );

    const storageKeys: ECDHCryptoKeyPair = await importKeyPair(
      {
        privateKeyJWK: await decryptPrivateKey(
          storedData.storage.private,
          password
        ),
        publicKeyJWK: storedData.storage.jwk,
      },
      "ecdh"
    );

    return new Client(storage, thumbprint, id, storageKeys);
  }

  async decryptFromSelf(message: SignedSelfEncrypted): Promise<string> {
    const selfEncrypted = await parseJWS(
      message,
      this.identityKeyPair.publicKey
    );

    const epk = await importPublicKey("ECDH", selfEncrypted.header.epk);

    const secret = await deriveSharedSecret(
      this.storageKeyPair.privateKey,
      epk
    );
    const payload = await decryptData(
      secret,
      selfEncrypted.header.iv,
      selfEncrypted.payload
    );
    return payload;
  }
  async encryptToSelf(message: string) {
    const epk = await generateECDHKeyPair();
    const jwks = await exportKeyPair(epk);

    const secret = await deriveSharedSecret(
      epk.privateKey,
      this.storageKeyPair.publicKey
    );
    const { iv, encrypted } = await encryptData(secret, message);

    const selfEncrypted: SelfEncrypted = {
      header: {
        alg: "ES384",
        jwk: (await exportKeyPair(this.identityKeyPair)).publicKeyJWK,
        iat: 0,
        sub: "self-encrypted",
        iv,
        epk: jwks.publicKeyJWK,
      },
      payload: encrypted,
    };

    const encryptedJWS = (await signJWS(
      selfEncrypted.header,
      selfEncrypted.payload,
      this.identityKeyPair.privateKey
    )) as SignedSelfEncrypted;
    // try {
    invariant(await verifyJWS(encryptedJWS), "Error encrypting message");
    const decryptedMessage = await this.decryptFromSelf(encryptedJWS);
    invariant(decryptedMessage, "Decrypted message is empty");
    invariant(
      decryptedMessage === message ||
        message === JSON.stringify(decryptedMessage),
      "Decrypted message mismatch"
    );
    // } catch (e: any) {
    //   throw new Error(`Error encrypting message: ${e?.message ?? e}`);
    // }

    return encryptedJWS;
  }

  async createInvitation({
    note,
    nickname,
  }: {
    note?: string;
    nickname: string;
  }): Promise<SignedInvitation> {
    const { thumbprint, jwks } = await this.makeThreadKeys();

    const invitation: Invitation = {
      header: {
        alg: "ES384",
        jwk: (await exportKeyPair(this.identityKeyPair)).publicKeyJWK,
        iat: 0,
        sub: "grid-invitation",
      },
      payload: {
        messageId: Number(
          messageIdForInviteTesting ??
            Math.floor(Math.random() * MAX_MESSAGE_ID)
        ).toString(16),
        epk: jwks.publicKeyJWK,
        note,
        nickname,
      },
    };
    const signedInvitation = (await signJWS(
      invitation.header,
      invitation.payload,
      this.identityKeyPair.privateKey
    )) as SignedInvitation;

    this.storage.setItem(`invitation:${thumbprint}`, signedInvitation);
    this.storage.appendItem(`invitations:${this.thumbprint}`, thumbprint);
    this.notifySubscribers();
    return signedInvitation;
  }

  async replyToInvitation(
    signedInvite: SignedInvitation,
    message: string,
    nickname: string
  ) {
    invariant(await verifyJWS(signedInvite), "Invalid invitation signature");
    const invite = await parseJWS<Invitation>(signedInvite);

    const threadId = await this.startThread(
      signedInvite,
      invite.payload.epk,
      invite.header.jwk,
      invite.payload.messageId
    );

    await this.appendThread(signedInvite, threadId);
    const reply = this.replyToThread(threadId, message, {
      selfSign: true,
      nickname,
    });

    return reply;
  }

  private async startThread(
    signedInvite: SignedInvitation,
    theirEPKJWK: JWK<"ECDH", "public">,
    theirSignature: JWK<"ECDSA", "public">,
    messageId: string,
    myThumbprint?: Thumbprint<"ECDH">
  ): Promise<ThreadID> {
    if (!myThumbprint) {
      const { thumbprint } = await this.makeThreadKeys();
      myThumbprint = thumbprint;
    }
    const keyBackup = this.storage.getItem(
      `encrypted-thread-key:${myThumbprint}`
    );
    invariant(keyBackup, `Thread key not found ${myThumbprint}`);

    const signatureThumbprint = await getJWKthumbprint(theirSignature);
    const thumbprints: Thumbprint<"ECDH">[] = [
      await getJWKthumbprint(theirEPKJWK),
      myThumbprint,
    ].sort();

    const threadId = ArrayBuffertohex(
      await window.crypto.subtle.digest(
        "SHA-256",
        Buffer.from(thumbprints.join(":"))
      )
    ) as ThreadID;

    this.storage.setItem(`public-key:${signatureThumbprint}`, theirSignature);
    this.storage.setItem(`thread-info:${threadId}`, {
      myThumbprint,
      theirEPK: theirEPKJWK,
      signedInvite,
      theirSignature,
    });
    this.storage.appendItem(`threads:${this.thumbprint}`, threadId);
    this.storage.storeMesage(threadId, messageId, signedInvite);

    this.storage.setItem(`message-id:${threadId}`, messageId);
    this.notifySubscribers();

    return threadId;
  }

  getThreads = (): ThreadID[] =>
    this.storage.getItem(`threads:${this.thumbprint}`) ?? [];
  getInvitations = () =>
    (this.storage.getItem(`invitations:${this.thumbprint}`) ?? []).map(
      (t) => this.storage.getItem(`invitation:${t}`)!
    );

  getInvitation(thumbprint: Thumbprint<"ECDH">) {
    return this.storage.getItem(`invitation:${thumbprint}`);
  }

  private async makeThreadKeys() {
    const threadKey = await generateECDHKeyPair();
    const jwks = await exportKeyPair(threadKey);
    const thumbprint = await getJWKthumbprint(jwks.publicKeyJWK);
    setNickname(thumbprint, `thread[${this.clientNickname}]`);
    const keyBackup = await this.encryptToSelf(JSON.stringify(jwks));
    this.storage.setItem(`encrypted-thread-key:${thumbprint}`, keyBackup);

    return { thumbprint, jwks };
  }

  private async readThreadSecret(threadThumbprint: ThreadID): Promise<{
    secret: SymmetricKey;
    epk: JWK<"ECDH", "public">;
  }> {
    const threadInfo = this.storage.getItem(`thread-info:${threadThumbprint}`);
    invariant(threadInfo, "Thread not found");

    const publicJWK = threadInfo.theirEPK;
    invariant(publicJWK, `Public key not found ${threadInfo.theirEPK}`);

    const encryptedBackup = this.storage.getItem(
      `encrypted-thread-key:${threadInfo.myThumbprint}`
    );
    invariant(
      typeof encryptedBackup === "string",
      `Thread key not found ${threadInfo.myThumbprint}`
    );

    type JWKPair = {
      privateKeyJWK: JWK<"ECDH", "private">;
      publicKeyJWK: JWK<"ECDH", "public">;
    };
    const jwks: JWKPair = JSON.parse(
      await this.decryptFromSelf(encryptedBackup)
    );
    const pKey = await importPublicKey("ECDH", publicJWK);
    const privateKey = await importPrivateKey("ECDH", jwks.privateKeyJWK);

    return {
      secret: await deriveSharedSecret(privateKey, pKey),
      epk: jwks.publicKeyJWK,
    };
  }

  public async replyToThread(
    threadId: ThreadID,
    message: string,
    options?: {
      selfSign?: boolean;
      nickname?: string;
    }
  ) {
    const { secret, epk } = await this.readThreadSecret(threadId);
    const messageId = this.storage.getItem(`message-id:${threadId}`);
    invariant(typeof messageId === "string", `Invalid message id ${messageId}`);
    const nextId = incMessageId(messageId);
    const threadInfo = this.storage.getItem(`thread-info:${threadId}`);
    invariant(threadInfo, "Thread not found");

    let replyMessage: Decrypted<ReplyMessage | ReplyToInvite> = {
      header: {
        iat: 0,
        alg: "ES384",
        sub: "grid-reply",
        re: threadId,
        iv: "",
        from: this.thumbprint,
      },
      payload: {
        messageId: nextId,
        message,
      },
    };
    this.storage.setItem(`message-id:${threadId}`, nextId);
    if (options?.selfSign && options.nickname) {
      const ack: Decrypted<ReplyToInvite> = {
        header: {
          ...replyMessage.header,
          sub: "reply-to-invite",
          jwk: await exportKey(this.identityKeyPair.publicKey),
          invite: await getJWKthumbprint(threadInfo.theirEPK),
          epk,
        },
        payload: {
          ...replyMessage.payload,
          nickname: options.nickname,
        },
      };
      replyMessage = ack;
    }

    const { iv, encrypted } = await encryptData(secret, replyMessage.payload);
    replyMessage.header.iv = iv;
    const encryptedJWS = (await signJWS(
      replyMessage.header,
      encrypted,
      this.identityKeyPair.privateKey
    )) as SignedReply;

    invariant(
      verifyJWS(encryptedJWS, this.identityKeyPair.publicKey),
      "Error encrypting message"
    );

    await this.appendThread(encryptedJWS, threadId);
    return encryptedJWS;
  }

  public async appendThread(
    encryptedMessage: SignedTransport,
    threadId?: ThreadID
  ): Promise<{
    threadId: ThreadID;
    message: {
      message: string;
      type: "invite" | "message";
    };
  }> {
    if (!threadId) {
      const jws = await parseJWS(encryptedMessage, null);
      switch (jws.header.sub) {
        case "grid-invitation": {
          // const invite = jws as Invitation;
          throw new Error("Not Implemented");
          break;
        }
        case "reply-to-invite": {
          const reply = jws as ReplyToInvite;
          invariant(reply.header.epk, "First message must have an epk");
          invariant(
            reply.header.invite,
            'First message must have an "invite" header'
          );
          const invitationThumbprint = reply.header.invite;
          const invitation = this.storage.getItem(
            `invitation:${invitationThumbprint}`
          );
          invariant(invitation, "Invitation not found " + invitationThumbprint);
          const invitationJWS = await parseJWS<Invitation>(invitation);

          const myThumbprint = await getJWKthumbprint(
            invitationJWS.payload.epk
          );
          threadId = await this.startThread(
            invitation,
            reply.header.epk,
            reply.header.jwk,
            invitationJWS.payload.messageId,
            myThumbprint
          );
          await this.appendThread(invitation, threadId);
          // FALLS THROUGH
        }
        case "grid-reply": {
          const reply = jws as ReplyMessage;
          threadId ??= reply.header.re;
          const threadInfo = this.storage.getItem(`thread-info:${threadId}`);

          let isValid = false;
          if (reply.header.from === this.thumbprint) {
            isValid = await verifyJWS(
              encryptedMessage,
              this.identityKeyPair.publicKey
            );
          } else {
            isValid = await verifyJWS(
              encryptedMessage,
              threadInfo.theirSignature
            );
          }
          invariant(isValid, "Invalid message signature");

          return this.appendThread(encryptedMessage, threadId);
        }
      }
    }
    invariant(threadId, "Thread not found");
    const message = await this.decryptMessage(threadId, encryptedMessage);

    const lastId = this.storage.getItem(`message-id:${threadId}`);

    if (incMessageId(lastId) === message.messageId) {
      this.storage.setItem(`message-id:${threadId}`, message.messageId);
    } else if (message.messageId < lastId) {
      // console.error("skipping duplicate message", message.messageId, lastId);
      throw new Error("Repeat Message");
    } else {
      const missing = parseInt(message.messageId, 16) - parseInt(lastId, 16);
      const MESSAGE_WINDOW = 5;
      invariant(
        missing < MESSAGE_WINDOW,
        `${this.clientNickname} Missing ${missing} messages between ${lastId} and ${message.messageId}`
      );

      const outOfOrder =
        this.storage.queryItem(`out-of-order:${threadId}`) ?? {};
      outOfOrder[message.messageId] = encryptedMessage;
      this.storage.setItem(`out-of-order:${threadId}`, outOfOrder);
    }
    this.storage.storeMesage(threadId, message.messageId, encryptedMessage);
    this.notifySubscribers();
    return {
      threadId: threadId,
      message,
    };
  }

  public async decryptThread(threadId: ThreadID) {
    const messages = this.getEncryptedThread(threadId);
    return Promise.all(
      messages.map(async (message) => {
        return typeof message === "string"
          ? this.decryptMessage(threadId, message)
          : message;
      })
    );
  }
  public async decryptMessage(
    threadId: ThreadID,
    encryptedMessage: SignedTransport
  ): Promise<DecryptedMessageType> {
    const threadInfo = this.storage.getItem(`thread-info:${threadId}`);
    const jws = await parseJWS(encryptedMessage, null);
    invariant(threadInfo, "Thread not found");

    if (jws.header.sub === "grid-invitation") {
      // Looks like an Invite
      invariant(await verifyJWS(encryptedMessage), "Invalid message signature");
      const jwsInvite: Invitation = jws as Invitation;

      const message = `Invite from ${jwsInvite.payload.nickname}.\nNote: ${
        jwsInvite.payload.note ?? "(none)"
      }`;

      const from = await getJWKthumbprint(jwsInvite.header.jwk);
      if (jwsInvite.payload.nickname) {
        setNickname(from, jwsInvite.payload.nickname);
      }
      return {
        from: getNickname(from),
        fromThumbprint: from,
        message,
        type: "invite",
        iat: jwsInvite.header.iat,
        messageId: jwsInvite.payload.messageId,
      };
    }
    const reply = jws as ReplyMessage | ReplyToInvite;
    const { secret } = await this.readThreadSecret(threadId);
    const payload = await decryptData<ReplyToInvitePayload | ReplyPayload>(
      secret,
      jws.header.iv,
      reply.payload
    );
    const from = reply.header.from;

    return {
      from: getNickname(from),
      fromThumbprint: from,
      message: payload.message,
      type: "message",
      iat: reply.header.iat,
      messageId: payload.messageId,
    };
  }

  public getEncryptedThread(threadId: ThreadID) {
    return this.storage.readMessages(threadId);
  }

  public async getThreadInfo(thread: ThreadID) {
    const threadInfo = this.storage.getItem(`thread-info:${thread}`);
    invariant(threadInfo, "Thread not found");

    return {
      myNickname: getNickname(this.thumbprint),
      theirNickname: getNickname(
        await getJWKthumbprint(threadInfo.theirSignature)
      ),
    };
  }

  async makeBackup(password: string) {
    const idJWKs = await exportKeyPair(this.identityKeyPair);
    const storageJWKs = await exportKeyPair(this.storageKeyPair);

    const encryptedIdentity = await encryptPrivateKey(
      idJWKs.privateKeyJWK,
      password
    );
    const encryptedStorageKey = await encryptPrivateKey(
      storageJWKs.privateKeyJWK,
      password
    );

    const thumbprint = await getJWKthumbprint(idJWKs.publicKeyJWK);

    const invitations = this.storage
      .getItem(`invitations:${this.thumbprint}`)
      ?.map((invitationThumbprint) => {
        return this.storage.getItem(`invitation:${invitationThumbprint}`)!;
      });

    const threads = this.storage
      .getItem(`threads:${this.thumbprint}`)
      ?.map((threadId) => {
        const threadInfo = this.storage.getItem(`thread-info:${threadId}`);
        const messages = this.storage.getItem(`keyed-messages:${threadId}`);

        return [
          threadId,
          {
            ...threadInfo,
            messages,
          },
        ];
      });

    const payload: BackupPayload = {
      thumbprint,
      encryptedIdentity,
      idJWK: idJWKs.publicKeyJWK,
      encryptedStorageKey,
      storageJWK: storageJWKs.publicKeyJWK,
      invitations,
      threads: Object.fromEntries(threads ?? []),
    };

    return signJWS(
      {
        alg: "ES384",
        jwk: idJWKs.publicKeyJWK,
      },
      payload,
      this.identityKeyPair.privateKey
    ) as Promise<SignedBackup>;
  }

  private notifySubscribers() {
    for (const sub of this.subscriptions) {
      sub();
    }
  }
  private subscriptions = new Set<() => void>();
  public subscribe(onChange: () => void) {
    this.subscriptions.add(onChange);

    return () => {
      this.subscriptions.delete(onChange);
    };
  }
}

export function incMessageId(messageId: string) {
  let nextId = parseInt(messageId, 16) + 1;
  if (nextId >= MAX_MESSAGE_ID) {
    nextId = 1;
  }
  invariant(!Number.isNaN(nextId), `Invalid message id ${messageId} ${nextId}`);
  const n = nextId.toString(16);
  invariant(
    !Number.isNaN(n),
    `Invalid message toString ${messageId} ${nextId}`
  );
  return n;
}
