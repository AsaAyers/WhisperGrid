/* eslint-disable @typescript-eslint/no-explicit-any */
import { GridStorage } from "./GridStorage";
import {
  SignedInvitation,
  Invitation,
  SelfEncrypted,
  ReplyMessage,
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
  return keyNicknames.get(key) + "(" + key.substring(key.length - 5) + ")";
}

export async function serializeWithNicknames(data: any) {
  const entries = Object.entries(data).map(([key, value]) => {
    // const [prefix, ...rest] = key.split(":", 2);
    const i = key.indexOf(":");
    if (i > 0) {
      const prefix = key.slice(0, i);
      const thumbprint = key.slice(i + 1);
      if (keyNicknames.has(thumbprint)) {
        key = `${prefix}:[${keyNicknames.get(thumbprint)}]`;
      }
    }
    return [key, value];
  });

  return JSON.stringify(Object.fromEntries(entries), null, 2);
}

const MAX_MESSAGE_ID = Number.MAX_SAFE_INTEGER / 2;

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

  log(...args: any[]) {
    console.log(`[${this.clientNickname}]`, ...args);
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

  toString() {
    return this.thumbprint;
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
      },
      payload: {
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
    nickname?: string;
  }): Promise<SignedInvitation> {
    const { thumbprint, jwks } = await this.makeThreadKeys();

    const invitation: Invitation = {
      header: {
        alg: "ES384",
        jwk: (await exportKeyPair(this.identityKeyPair)).publicKeyJWK,
      },
      payload: {
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
    return signedInvitation;
  }

  async replyToInvitation(signedInvite: SignedInvitation, message: string) {
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
    });

    return reply;
  }

  private async startThread(
    signedInvite: SignedInvitation,
    theirEPKJWK: JWK<"ECDH", "public">,
    theirSignature: JWK<"ECDSA", "public">,
    messageId: string,
    myThumbprint?: Thumbprint<"ECDH">
  ): Promise<string> {
    if (!myThumbprint) {
      const { thumbprint } = await this.makeThreadKeys();
      myThumbprint = thumbprint;
    }
    const keyBackup = this.storage.getItem(
      `encrypted-thread-key:${myThumbprint}`
    );
    invariant(keyBackup, `Thread key not found ${myThumbprint}`);

    const signatureThumbprint = await getJWKthumbprint(theirSignature);
    this.storage.setItem(`public-key:${signatureThumbprint}`, theirSignature);
    this.storage.setItem(`thread-info:${myThumbprint}`, {
      myThumbprint,
      theirEPK: theirEPKJWK,
      signedInvite,
      theirSignature,
    });
    this.storage.appendItem(`threads:${this.thumbprint}`, myThumbprint);
    this.storage.appendItem(`messages:${myThumbprint}`, signedInvite);
    this.storage.setItem(`message-id:${myThumbprint}`, messageId);

    return myThumbprint;
  }

  getThreads = () => this.storage.getItem(`threads:${this.thumbprint}`) ?? [];
  getInvitations = () =>
    (this.storage.getItem(`invitations:${this.thumbprint}`) ?? []).map(
      (t) => this.storage.getItem(`invitation:${t}`)!
    );

  private async makeThreadKeys() {
    const threadKey = await generateECDHKeyPair();
    const jwks = await exportKeyPair(threadKey);
    const thumbprint = await getJWKthumbprint(jwks.publicKeyJWK);
    setNickname(thumbprint, `thread[${this.clientNickname}]`);
    const keyBackup = await this.encryptToSelf(JSON.stringify(jwks));
    this.storage.setItem(`encrypted-thread-key:${thumbprint}`, keyBackup);

    return { thumbprint, jwks };
  }

  async readThreadSecret(threadThumbprint: string): Promise<{
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

  async replyToThread(
    threadThumbprint: string,
    message: string,
    options?: { selfSign?: boolean }
  ) {
    const { secret, epk } = await this.readThreadSecret(threadThumbprint);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      secret,
      new TextEncoder().encode(message)
    );

    const messageId = this.storage.getItem(`message-id:${threadThumbprint}`);
    invariant(typeof messageId === "string", `Invalid message id ${messageId}`);

    const nextId = parseInt(messageId, 16) + 1;
    // if (nextId >= MAX_MESSAGE_ID) {
    //   nextId = 1;
    // }
    this.storage.setItem(
      `message-id:${threadThumbprint}`,
      Number(nextId).toString(16)
    );

    const threadInfo = this.storage.getItem(`thread-info:${threadThumbprint}`);
    invariant(threadInfo, "Thread not found");

    const re = await getJWKthumbprint(threadInfo.theirEPK);
    const replyMessage: ReplyMessage = {
      header: { alg: "ES384" },
      payload: {
        re,
        messageId: Number(nextId).toString(16),
        // message: Buffer.from(encrypted).toString("base64url"),
        message: bufferToB64u(encrypted),
        iv: Buffer.from(iv).toString("base64"),
      },
    };
    if (options?.selfSign) {
      replyMessage.header.jwk = (
        await exportKeyPair(this.identityKeyPair)
      ).publicKeyJWK;
      replyMessage.payload.epk = epk;
    }

    const encryptedJWS = await signJWS(
      replyMessage.header,
      replyMessage.payload,
      this.identityKeyPair.privateKey
    );

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

    await this.appendThread(encryptedJWS, threadThumbprint);
    return encryptedJWS;
  }

  async appendThread(
    encryptedMessage: string,
    threadThumbprint?: string
  ): Promise<{
    threadThumbprint: string;
    message: string;
  }> {
    if (!threadThumbprint) {
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
        const invitationThumbprint = jws.payload.re;
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
        threadThumbprint = await this.startThread(
          invitation,
          jws.payload.epk,
          jws.header.jwk,
          jws.payload.messageId,
          myThumbprint
        );
      }
    }

    const threadInfo = this.storage.getItem(`thread-info:${threadThumbprint}`);
    const jws = await parseJWS<ReplyMessage>(encryptedMessage, null);
    invariant(threadInfo, "Thread not found");

    if (!(await verifyJWS(encryptedMessage))) {
      let pubKey: null | ECDSACryptoKey<"public"> = null;
      if (!jws.header.jwk && jws.payload.re) {
        if (jws.payload.re === threadInfo.myThumbprint) {
          pubKey = await importPublicKey("ECDSA", threadInfo.theirSignature);
        }
        if (jws.payload.re === (await getJWKthumbprint(threadInfo.theirEPK))) {
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
            jws.payload.re
          )} to be signed with ${expected}`
        );
      }
    }

    const { secret } = await this.readThreadSecret(threadThumbprint);
    const iv = b64uToBuffer(jws.payload.iv);

    let decryptedBuffer;
    try {
      decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: Uint8Array.from(iv),
        },
        secret,
        b64uToBuffer(jws.payload.message)
      );
    } catch (e: any) {
      throw new Error(`Error appending thread ${e?.message ?? e}`);
    }
    const message = new TextDecoder().decode(decryptedBuffer);

    this.storage.appendItem(`messages:${threadThumbprint}`, encryptedMessage);
    return {
      threadThumbprint,
      message,
    };
  }
}
