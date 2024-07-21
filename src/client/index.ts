/* eslint-disable @typescript-eslint/no-explicit-any */
import { GridStorage, ThreadID } from "./GridStorage";
import {
  SignedInvitation,
  Invitation,
  SelfEncrypted,
  ReplyMessage,
  SignedReply,
  SignedBackup,
  ReplyToInvite,
  Decrypted,
  SignedSelfEncrypted,
  ReplyToInvitePayload,
  ReplyPayload,
  SignedTransport,
  BackupPayload,
  UnpackTaggedString,
  SignedReplyToInvite,
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
  parseJWSSync,
} from "./utils";
import { ArrayBuffertohex } from "jsrsasign";
import { synAck } from "./synAck";

const keyNicknames = new Map<string, string>();
export function setNickname(key: string, nickname: string) {
  keyNicknames.set(key, nickname);
}

export function getNickname(key: string) {
  return keyNicknames.get(key) + "_" + key.substring(key.length - 6);
}

let messageIdForInviteTesting: number | undefined;
export function setMessageIdForTesting(messageId: number) {
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
  minAck: string | undefined;
  epkThumbprint: Thumbprint<"ECDH">;
  relay?: string;
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
    private readonly thumbprint: Thumbprint<"ECDSA">,
    private readonly identityKeyPair: ECDSACryptoKeyPair,
    private readonly storageKeyPair: ECDHCryptoKeyPair
  ) {}

  async getThumbprint() {
    return this.thumbprint;
  }

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
      backup.identity.id.private,
      password
    );
    const storagePrivateKey = await decryptPrivateKey(
      backup.identity.storage.private,
      password
    );

    const identityKeyPair: ECDSACryptoKeyPair = await importKeyPair(
      {
        privateKeyJWK: identityPrivateKey,
        publicKeyJWK: backup.identity.id.jwk,
      },
      "ecdsa"
    );
    const storageKeyPair: ECDHCryptoKeyPair = await importKeyPair(
      {
        privateKeyJWK: storagePrivateKey,
        publicKeyJWK: backup.identity.storage.jwk,
      },
      "ecdh"
    );

    await storage.loadIdentityBackup(backup);
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
    this.storage.appendItem(`invitations:${this.thumbprint}`, thumbprint, {
      unique: true,
    });
    this.storage.setItem(
      `threads:${this.thumbprint}`,
      this.storage.queryItem(`threads:${this.thumbprint}`) ?? []
    );
    this.notifySubscribers();
    return signedInvitation;
  }

  async replyToInvitation(
    signedInvite: SignedInvitation,
    message: string,
    nickname: string,
    { setMyRelay }: { setMyRelay?: string } = {}
  ) {
    invariant(await verifyJWS(signedInvite), "Invalid invitation signature");
    const invite = await parseJWS(signedInvite);

    const threadId = await this.startThread(
      signedInvite,
      invite.payload.epk,
      invite.header.jwk
    );
    const reply = this.replyToThread(threadId, message, {
      selfSign: true,
      nickname,
      setMyRelay,
    });
    return reply;
  }

  private async startThread(
    signedInvite: SignedInvitation,
    theirEPKJWK: JWK<"ECDH", "public">,
    theirSignature: JWK<"ECDSA", "public">,
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
    invariant(
      !myThumbprint || signatureThumbprint !== this.thumbprint,
      "Cannot start a thread with yourself"
    );

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

    this.storage.setItem(`thread-info:${this.thumbprint}:${threadId}`, {
      missing: [],
      windowSize: 5,
      maxAck: undefined,
      minAck: undefined,
      syn: undefined,
      myThumbprint,
      theirEPK: theirEPKJWK,
      signedInvite,
      theirSignature,
      relays: {},
    });
    this.storage.appendItem(`threads:${this.thumbprint}`, threadId);
    await this.appendThread(signedInvite, threadId);

    this.notifySubscribers();

    return threadId;
  }

  async getThreads(): Promise<ThreadID[]> {
    return this.storage.queryItem(`threads:${this.thumbprint}`) ?? [];
  }
  async getInvitationIds() {
    return this.storage.queryItem(`invitations:${this.thumbprint}`) ?? [];
  }
  async getInvitations() {
    return (await this.getInvitationIds()).map(
      (t) => this.storage.getItem(`invitation:${t}`)!
    );
  }

  async getInvitation(thumbprint: Thumbprint<"ECDH">) {
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
    const threadInfo = this.storage.getItem(
      `thread-info:${this.thumbprint}:${threadThumbprint}`
    );
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
      setMyRelay?: string;
    }
  ): Promise<{
    reply: SignedReply;
    threadId: ThreadID;
    relay?: string;
  }> {
    const { secret, epk } = await this.readThreadSecret(threadId);
    const threadInfo = this.storage.getItem(
      `thread-info:${this.thumbprint}:${threadId}`
    );
    invariant(threadInfo, "Thread not found");
    const messageId =
      threadInfo.syn ??
      Number(
        messageIdForInviteTesting
          ? parseInt("100000", 16) + messageIdForInviteTesting
          : Math.floor(Math.random() * MAX_MESSAGE_ID)
      ).toString(16);
    invariant(typeof messageId === "string", `Invalid message id ${messageId}`);
    const nextId = incMessageId(messageId);
    if (options?.setMyRelay) {
      threadInfo.relays[this.thumbprint] = options.setMyRelay;
    }

    invariant(threadInfo.minAck, `Missing minAck in "thread-info" ${message}`);
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
        minAck: threadInfo.minAck,
      },
    };
    // threadInfo.syn = nextId;
    this.storage.setItem(
      `thread-info:${this.thumbprint}:${threadId}`,
      threadInfo
    );
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
          messageId: Number(
            messageIdForInviteTesting
              ? parseInt("100000", 16) + messageIdForInviteTesting
              : Math.floor(Math.random() * MAX_MESSAGE_ID)
          ).toString(16),
        },
      };
      replyMessage = ack;
    }
    if (options?.setMyRelay) {
      replyMessage.payload.relay = options.setMyRelay;
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
    const theirThumbprint = await getJWKthumbprint(threadInfo.theirSignature);
    const relay = threadInfo.relays[theirThumbprint];

    await this.appendThread(encryptedJWS, threadId);
    return {
      reply: encryptedJWS,
      threadId,
      relay,
    };
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
    relay?: string;
  }> {
    const jws = parseJWSSync(encryptedMessage);
    if (!threadId) {
      switch (jws.header.sub) {
        case "grid-invitation": {
          // const invite = jws as Invitation;
          throw new Error("Not Implemented");
          break;
        }
        case "reply-to-invite": {
          const isValid = verifyJWS(encryptedMessage);
          invariant(isValid, "Expected a self-signed message");
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
          const invitationJWS = await parseJWS(invitation);

          const myThumbprint = await getJWKthumbprint(
            invitationJWS.payload.epk
          );
          threadId = await this.startThread(
            invitation,
            reply.header.epk,
            reply.header.jwk,
            myThumbprint
          );
          // FALLS THROUGH
        }
        case "grid-reply": {
          const reply = jws as ReplyMessage;
          threadId ??= reply.header.re;
          const threadInfo = this.storage.getItem(
            `thread-info:${this.thumbprint}:${threadId}`
          );

          const fromMe = reply.header.from === this.thumbprint;
          let isValid = false;
          if (fromMe) {
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
    const threadInfo = {
      ...this.storage.getItem(`thread-info:${this.thumbprint}:${threadId}`),
    };

    const fromMe = message.fromThumbprint === this.thumbprint;

    let isValid;
    if (fromMe) {
      isValid = await verifyJWS(
        encryptedMessage,
        this.identityKeyPair.publicKey
      );
    } else {
      isValid = await verifyJWS(encryptedMessage, threadInfo.theirSignature);
    }
    invariant(isValid, "Invalid message signature");
    const storeMessage = synAck(
      fromMe
        ? {
            syn: message.messageId,
          }
        : {
            ack: message.messageId,
          },
      threadInfo
    );

    if (storeMessage) {
      const m = this.storage.queryItem(
        `keyed-messages:${this.thumbprint}:${threadId}`
      )?.messages;
      invariant(
        m ? !m.includes(encryptedMessage) : true,
        // m?.[0] !== encryptedMessage || lastMessage !== encryptedMessage,
        `Message already exists in thread ${JSON.stringify(
          {
            nickname: this.clientNickname,
            messageId: message.messageId,
            sub: jws.header.sub,
            threadId,
            messageIndex: m?.indexOf(encryptedMessage),
          },
          null,
          2
        )}`
      );
      if (message.relay) {
        threadInfo.relays[await getJWKthumbprint(threadInfo.theirSignature)] =
          message.relay;

        if (
          message.relay &&
          message.relay.match(/^https?:\/\/ntfy.sh\/[^.]+$/)
        ) {
          threadInfo.relays[this.thumbprint] = message.relay;
        }
      }
      this.storage.setItem(
        `thread-info:${this.thumbprint}:${threadId}`,
        threadInfo
      );
      this.storage.storeMessage(
        this.thumbprint,
        threadId,
        message.messageId,
        encryptedMessage
      );
      this.notifySubscribers();
    } else {
      console.warn("Skipping message", message.messageId);
    }
    return {
      threadId: threadId,
      message,
      relay: message.relay,
    };
  }

  public async decryptThread(threadId: ThreadID) {
    const thread = await this.getEncryptedThread(threadId);
    const messages = await Promise.all(
      thread.map(async (message) => {
        return typeof message === "string"
          ? this.decryptMessage(threadId, message)
          : message;
      })
    );
    messages.sort((a, b) => {
      if (a.from !== b.from) {
        if (a.minAck && a.minAck < b.messageId) {
          return 1;
        }
        if (b.minAck && b.minAck < a.messageId) {
          return 1;
        }
      }
      const order =
        (a.type === "invite" ? -1 : 0) ||
        (b.type === "invite" ? 1 : 0) ||
        b.iat - a.iat ||
        (a.from === b.from ? a.messageId.localeCompare(b.messageId) : 0);

      return order;
    });
    return messages;
  }
  public async decryptMessage(
    threadId: ThreadID,
    encryptedMessage: SignedTransport
  ): Promise<DecryptedMessageType> {
    const threadInfo = this.storage.getItem(
      `thread-info:${this.thumbprint}:${threadId}`
    );
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
        epkThumbprint: await getJWKthumbprint(jwsInvite.payload.epk),
        message,
        type: "invite",
        iat: jwsInvite.header.iat,
        messageId: jwsInvite.payload.messageId,
        minAck: undefined,
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

    const theirThumbprint = await getJWKthumbprint(threadInfo.theirSignature);
    const epkThumbprint =
      from === theirThumbprint
        ? await getJWKthumbprint(threadInfo.theirEPK)
        : threadInfo.myThumbprint;

    return {
      from: getNickname(from),
      fromThumbprint: from,
      epkThumbprint,
      message: payload.message,
      type: "message",
      iat: reply.header.iat,
      messageId: payload.messageId,
      minAck: payload.minAck,
      relay: payload.relay,
    };
  }

  public async getEncryptedThread(threadId: ThreadID) {
    return this.storage.readMessages(this.thumbprint, threadId);
  }

  public async getThreadInfo(thread: ThreadID) {
    const threadInfo = this.storage.getItem(
      `thread-info:${this.thumbprint}:${thread}`
    );
    invariant(threadInfo, "Thread not found");
    const myRelay = threadInfo.relays[this.thumbprint];

    return {
      myRelay,
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
    const payload = await this.storage.makeIdentityBackup(
      this.thumbprint,
      encryptedIdentity,
      encryptedStorageKey
    );

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
      try {
        sub?.();
      } catch (e) {
        // Ignore
      }
    }
  }
  private subscriptions = new Set<() => void>();
  public subscribe(onChange: () => void) {
    this.subscriptions ??= new Set<() => void>();
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

export type {
  BackupPayload,
  Invitation,
  SignedInvitation,
  SignedReply,
  SignedReplyToInvite,
  SignedTransport,
  Thumbprint,
  ThreadID,
  UnpackTaggedString,
};
export { GridStorage };
