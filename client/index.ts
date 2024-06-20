import { GridStorage } from "./GridStorage";
import { SignedInvitation, Invitation, SelfEncrypted } from "./types";
import {
  generateECDSAKeyPair,
  generateECDHKeyPair,
  ecdhAlg,
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
} from "./utils";

export class Client {
  constructor(
    private storage: GridStorage,
    public readonly thumbprint: string,
    private readonly identityKeyPair: CryptoKeyPair,
    private readonly storageKeyPair: CryptoKeyPair
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

    const storageKeys: CryptoKeyPair = await importKeyPair(
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

    const epk = await window.crypto.subtle.importKey(
      "jwk",
      selfEncrypted.payload.epk,
      ecdhAlg,
      true,
      []
    );

    const secret = await deriveSharedSecret(
      this.storageKeyPair.privateKey,
      epk
    );
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: Buffer.from(selfEncrypted.payload.iv, "base64url"),
      },
      secret,
      Buffer.from(selfEncrypted.payload.message, "base64url")
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
        message: Buffer.from(encrypted).toString("base64url"),
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
    const invitation: Invitation = {
      header: {
        alg: "ES384",
        jwk: (await exportKeyPair(this.identityKeyPair)).publicKeyJWK,
      },
      payload: {
        messageId: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
        threadJWK: (await exportKeyPair(this.storageKeyPair)).publicKeyJWK,
        note,
        nickname,
      },
    };

    const signedInvitation = (await signJWS(
      invitation.header,
      invitation.payload,
      this.identityKeyPair.privateKey
    )) as SignedInvitation;
    const thumbprint = await getJWKthumbprint(invitation.header.jwk);
    this.storage.setItem(`invitation:${thumbprint}`, signedInvitation);

    return signedInvitation;
  }

  async replyToInvitation(signedInvite: SignedInvitation, message: string) {
    invariant(await verifyJWS(signedInvite), "Invalid invitation signature");
    const invite = await parseJWS<Invitation>(signedInvite);

    const threadKey = await generateECDHKeyPair();
    const jwks = await exportKeyPair(threadKey);
    const thumbprint = await getJWKthumbprint(jwks.publicKeyJWK);
    const keyBackup = await this.encryptToSelf(JSON.stringify(jwks));
    this.storage.setItem(`encrypted-thread-key:${thumbprint}`, keyBackup);

    const threadThumbprint = await getJWKthumbprint(invite.payload.threadJWK);
    this.storage.setItem(`thread-info:${threadThumbprint}`, {
      threadThumbprint: threadThumbprint,
      thumbprint,
      threadJWK: jwks.publicKeyJWK,
    });
    this.storage.appendItem(`threads:${this.thumbprint}`, threadThumbprint);
    this.storage.appendItem(`messages:${threadThumbprint}`, signedInvite);
    this.storage.setItem(
      `message-id:${threadThumbprint}`,
      invite.payload.messageId
    );

    return this.replyToThread(threadThumbprint, message);
  }

  async readThreadSecret(threadThumbprint: string) {
    const threadInfo = this.storage.getItem(`thread-info:${threadThumbprint}`);
    invariant(threadInfo, "Thread not found");
    const publicKey = await window.crypto.subtle.importKey(
      "jwk",
      threadInfo.threadJWK,
      ecdhAlg,
      true,
      []
    );

    const encryptedBackup = this.storage.getItem(
      `encrypted-thread-key:${threadInfo.thumbprint}`
    );
    invariant(typeof encryptedBackup === "string", "Thread key not found");

    const jwks: Awaited<ReturnType<typeof exportKeyPair>> = JSON.parse(
      await this.decryptFromSelf(encryptedBackup)
    );
    const privateKey = await window.crypto.subtle.importKey(
      "jwk",
      jwks.privateKeyJWK,
      ecdhAlg,
      true,
      ["deriveKey", "deriveBits"]
    );
    return await deriveSharedSecret(privateKey, publicKey);
  }

  async replyToThread(threadThumbprint: string, message: string) {
    const secret = await this.readThreadSecret(threadThumbprint);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      secret,
      new TextEncoder().encode(message)
    );

    let messageId = this.storage.getItem(`message-id:${threadThumbprint}`);
    invariant(typeof messageId === "number", "Invalid message id");

    messageId++;
    if (messageId > Number.MAX_SAFE_INTEGER) {
      messageId = 1;
    }
    this.storage.setItem(`message-id:${threadThumbprint}`, messageId);

    const encryptedJWS = await signJWS(
      { alg: "ES384" },
      {
        re: threadThumbprint,
        messageId: Number(messageId).toString(16),
        message: Buffer.from(encrypted).toString("base64url"),
        iv: Buffer.from(iv).toString("base64"),
      },
      this.identityKeyPair.privateKey
    );

    invariant(
      verifyJWS(encryptedJWS, this.identityKeyPair.publicKey),
      "Error encrypting message"
    );

    this.storage.appendItem(`messages:${threadThumbprint}`, encryptedJWS);
    return encryptedJWS;
  }
}
