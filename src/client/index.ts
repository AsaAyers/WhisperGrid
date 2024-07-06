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
  ECDSACryptoKey,
} from "./utils";
import { ArrayBuffertohex } from "jsrsasign";
const bufferToB64u = (src: Uint8Array | ArrayBuffer) =>
  Buffer.from(src)
    .toString("base64")
    .replace("+", "-")
    .replace("/", "_")
    .replace("=", "");

const b64uToBuffer = (str: string) =>
  Buffer.from(str.replace("-", "+").replace("_", "/"), "base64");

const keyNicknames = new Map<string, string>();
export function setNickname(key: string, nickname: string) {
  keyNicknames.set(key, nickname);
}

export function getNickname(key: string) {
  return keyNicknames.get(key) + "_" + key.substring(key.length - 6);
}

const MAX_MESSAGE_ID = Number.MAX_SAFE_INTEGER / 2;

export type DecryptedMessageType = {
  message: string;
  type: "invite" | "message";
  from: string;
  fromThumbprint: Thumbprint<"ECDSA">;
  iat: number;
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
    public readonly thumbprint: string,
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
      console.log("thumbprint", thumbprint);
      storage.setItem(`invitation:${thumbprint}`, invitation);
      storage.appendItem(`invitations:${backup.thumbprint}`, thumbprint);
    }

    for (const [t, { messages, ...threadInfo }] of Object.entries(
      backup.threads
    )) {
      const threadId = t as ThreadID;
      storage.setItem(`thread-info:${threadId}`, threadInfo);
      storage.appendItem(`threads:${backup.thumbprint}`, threadId);
      for (const message of messages) {
        storage.appendItem(`messages:${threadId}`, message);
      }
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
    thumbprint: string,
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

  async decryptFromSelf(message: string): Promise<string> {
    const selfEncrypted = await parseJWS<SelfEncrypted>(
      message,
      this.identityKeyPair.publicKey
    );

    const epk = await importPublicKey("ECDH", selfEncrypted.payload.epk);

    const secret = await deriveSharedSecret(
      this.storageKeyPair.privateKey,
      epk
    );
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: b64uToBuffer(selfEncrypted.payload.iv),
      },
      secret,
      b64uToBuffer(selfEncrypted.payload.message)
    );
    return new TextDecoder().decode(decryptedBuffer);
  }
  async encryptToSelf(message: string) {
    const epk = await generateECDHKeyPair();
    const jwks = await exportKeyPair(epk);

    const secret = await deriveSharedSecret(
      epk.privateKey,
      this.storageKeyPair.publicKey
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      secret,
      new TextEncoder().encode(message)
    );

    const selfEncrypted: SelfEncrypted = {
      header: {
        alg: "ES384",
        jwk: (await exportKeyPair(this.identityKeyPair)).publicKeyJWK,
        iat: 0,
      },
      payload: {
        sub: "self-encrypted",
        message: bufferToB64u(encrypted),
        iv: Buffer.from(iv).toString("base64"),
        epk: jwks.publicKeyJWK,
      },
    };

    const encryptedJWS = await signJWS(
      selfEncrypted.header,
      selfEncrypted.payload,
      this.identityKeyPair.privateKey
    );
    try {
      invariant(await verifyJWS(encryptedJWS), "Error encrypting message");
      const decryptedMessage = await this.decryptFromSelf(encryptedJWS);
      invariant(decryptedMessage === message, "Decrypted message mismatch");
    } catch (e: any) {
      throw new Error(`Error encrypting message: ${e?.message ?? e}`);
    }

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
      },
      payload: {
        sub: "grid-invitation",
        messageId: Number(Math.floor(Math.random() * MAX_MESSAGE_ID)).toString(
          16
        ),
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

    const threadThumbprint = await this.startThread(
      signedInvite,
      invite.payload.epk,
      invite.header.jwk,
      invite.payload.messageId
    );
    const reply = this.replyToThread(threadThumbprint, message, {
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
    this.storage.appendItem(`messages:${myThumbprint}`, signedInvite);
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
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedMessage = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      secret,
      new TextEncoder().encode(message)
    );
    const encryptedNickname = options?.nickname
      ? await window.crypto.subtle.encrypt(
          {
            name: "AES-GCM",
            iv,
          },
          secret,
          new TextEncoder().encode(options.nickname)
        )
      : null;

    const messageId = this.storage.getItem(`message-id:${threadId}`);
    invariant(typeof messageId === "string", `Invalid message id ${messageId}`);

    const nextId = parseInt(messageId, 16) + 1;
    // if (nextId >= MAX_MESSAGE_ID) {
    //   nextId = 1;
    // }
    this.storage.setItem(`message-id:${threadId}`, Number(nextId).toString(16));

    const threadInfo = this.storage.getItem(`thread-info:${threadId}`);
    invariant(threadInfo, "Thread not found");

    const replyMessage: ReplyMessage = {
      header: { alg: "ES384", iat: 0 },
      payload: {
        sub: "grid-reply",
        re: threadId,
        messageId: Number(nextId).toString(16),
        message: bufferToB64u(encryptedMessage),
        nickname: encryptedNickname
          ? bufferToB64u(encryptedNickname)
          : undefined,
        iv: Buffer.from(iv).toString("base64"),
      },
    };
    if (options?.selfSign) {
      replyMessage.header.jwk = (
        await exportKeyPair(this.identityKeyPair)
      ).publicKeyJWK;
      replyMessage.payload.epk = epk;
      replyMessage.header.invite = await getJWKthumbprint(threadInfo.theirEPK);
    }

    const encryptedJWS = (await signJWS(
      replyMessage.header,
      replyMessage.payload,
      this.identityKeyPair.privateKey
    )) as SignedReply;

    invariant(
      verifyJWS(encryptedJWS, this.identityKeyPair.publicKey),
      "Error encrypting message"
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: Uint8Array.from(iv),
      },
      secret,
      b64uToBuffer(replyMessage.payload.message)
    );
    invariant(
      new TextDecoder().decode(decryptedBuffer) === message,
      "Decrypted message mismatch"
    );

    await this.appendThread(encryptedJWS, threadId);
    return encryptedJWS;
  }

  public async appendThread(
    encryptedMessage: SignedInvitation | SignedReply,
    threadId?: ThreadID
  ): Promise<{
    threadId: ThreadID;
    message: {
      message: string;
      type: "invite" | "message";
    };
  }> {
    if (!threadId) {
      const jws = await parseJWS<ReplyMessage>(encryptedMessage, null);

      // invariant(jws.header.jwk, "First message must be self-signed");
      if (!jws.header.jwk) {
        invariant(
          this.storage.hasItem(`thread-info:${jws.payload.re}`),
          "Thread not found"
        );
        return this.appendThread(encryptedMessage, jws.payload.re);
      } else {
        invariant(jws.payload.epk, "First message must have an epk");
        invariant(
          jws.header.invite,
          'First message must have an "invite" header'
        );
        const invitationThumbprint = jws.header.invite;
        const invitation = this.storage.getItem(
          `invitation:${invitationThumbprint}`
        );
        invariant(invitation, "Invitation not found " + invitationThumbprint);
        const invitationJWS = await parseJWS<Invitation>(invitation);

        invariant(
          parseInt(jws.payload.messageId, 16) ===
            parseInt(invitationJWS.payload.messageId, 16) + 1,
          `Expected to find a reply to ${invitationJWS.payload.messageId} to be 1 more than ${jws.payload.messageId}`
        );

        const myThumbprint = await getJWKthumbprint(invitationJWS.payload.epk);
        threadId = await this.startThread(
          invitation,
          jws.payload.epk,
          jws.header.jwk,
          jws.payload.messageId,
          myThumbprint
        );
      }
    }

    const message = await this.decryptMessage(threadId, encryptedMessage);
    this.storage.appendItem(`messages:${threadId}`, encryptedMessage);
    this.notifySubscribers();
    return {
      threadId: threadId,
      message,
    };
  }

  public async decryptMessage(
    threadId: ThreadID,
    encryptedMessage: string | SignedInvitation | SignedReply
  ): Promise<DecryptedMessageType> {
    const threadInfo = this.storage.getItem(`thread-info:${threadId}`);
    const jws = await parseJWS<ReplyMessage | Invitation>(
      encryptedMessage,
      null
    );
    invariant(threadInfo, "Thread not found");
    if ("re" in jws.payload && jws.payload.re) {
      const jwsReply = jws as ReplyMessage;

      let from = jwsReply.header.jwk
        ? await getJWKthumbprint(jwsReply.header.jwk)
        : null;

      if (!(await verifyJWS(encryptedMessage))) {
        let pubKey: null | ECDSACryptoKey<"public"> = null;
        if (!jwsReply.header.jwk && jwsReply.payload.re) {
          if (jwsReply.payload.re === threadInfo.myThumbprint) {
            pubKey = await importPublicKey("ECDSA", threadInfo.theirSignature);
          }
          if (
            jwsReply.payload.re ===
            (await getJWKthumbprint(threadInfo.theirEPK))
          ) {
            pubKey = this.identityKeyPair.publicKey;
          }
        }
        invariant(pubKey != null, "Unable to determine public key");

        if (!(await verifyJWS(encryptedMessage, pubKey))) {
          const expected = getNickname(
            await getJWKthumbprint(threadInfo.theirSignature)
          );
          throw new Error(
            `expected message addressed to ${getNickname(
              jwsReply.payload.re
            )} to be signed with ${expected}`
          );
        }
        from = await getJWKthumbprint(await exportKey(pubKey));
      }
      invariant(from, "Unable to determine sender");

      const { secret } = await this.readThreadSecret(threadId);
      const iv = b64uToBuffer(jwsReply.payload.iv);

      let messageBuffer;
      let nicknameBuffer;
      try {
        messageBuffer = await window.crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: Uint8Array.from(iv),
          },
          secret,
          b64uToBuffer(jwsReply.payload.message)
        );
        const nickname = jwsReply.payload.nickname;
        nicknameBuffer = nickname
          ? await window.crypto.subtle.decrypt(
              {
                name: "AES-GCM",
                iv: Uint8Array.from(iv),
              },
              secret,
              b64uToBuffer(nickname)
            )
          : undefined;
      } catch (e: any) {
        throw new Error(`Error appending thread ${e?.message ?? e}`);
      }
      const message = new TextDecoder().decode(messageBuffer);
      if (nicknameBuffer) {
        setNickname(from, new TextDecoder().decode(nicknameBuffer));
      }

      return {
        from: getNickname(from),
        fromThumbprint: from,
        message,
        type: "message",
        iat: jws.header.iat!,
      };
    } else {
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
        iat: jwsInvite.header.iat!,
      };
    }
  }

  public getEncryptedThread(thumbprint: ThreadID) {
    return this.storage.getItem(`messages:${thumbprint}`);
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
      ?.map((threadThumbprint) => {
        const threadInfo = this.storage.getItem(
          `thread-info:${threadThumbprint}`
        );
        const messages = this.storage.getItem(`messages:${threadThumbprint}`);

        return [
          threadThumbprint,
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
