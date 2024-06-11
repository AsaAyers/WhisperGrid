import {
  KEYUTIL,
  KJUR,
  ArrayBuffertohex,
  JwkObject,
  hextoArrayBuffer,
} from "jsrsasign";

import { GridStorage } from "./GridStorage";
import {
  JsonWebKey,
  TaggedString,
  SignedInvitation,
  Invitation,
} from "./types";

function generatePrivateKeyPair() {
  const key = KEYUTIL.generateKeypair("EC", "secp384r1");
  const jwk: KJUR.jws.JWS.JsonWebKey = KEYUTIL.getJWKFromKey(key.pubKeyObj);
  const fingerprint = KJUR.jws.JWS.getJWKthumbprint(jwk);

  return {
    privateKey: key.prvKeyObj,
    fingerprint,
    jwk,
  };
}

export class Client {
  identityKey: KJUR.crypto.ECDSA;
  jwk: JsonWebKey;
  pem: TaggedString<"PEM">;

  static generateClient(storage: GridStorage, password: string): Client {
    const keyPair = generatePrivateKeyPair();

    const PEM = KEYUTIL.getPEM(
      keyPair.privateKey,
      "PKCS5PRV",
      password
    ) as TaggedString<"PEM">;

    storage.setItem(`PEM:${keyPair.fingerprint}`, PEM);
    return new Client(storage, keyPair.fingerprint, password);
  }

  constructor(
    private storage: GridStorage,
    public readonly fingerprint: string,
    password: string
  ) {
    const pem = this.storage.getItem(`PEM:${fingerprint}`);
    invariant(pem, `No private key found ${fingerprint}`);

    this.pem = pem;
    const key = KEYUTIL.getKey(pem, password);
    invariant(key instanceof KJUR.crypto.ECDSA, "Invalid key type");

    const ec = new KJUR.crypto.ECDSA({
      curve: "secp384r1",
      pub: key.generatePublicKeyHex(),
    });

    this.jwk = KEYUTIL.getJWKFromKey(ec);
    this.identityKey = key;
  }

  toString() {
    return this.pem;
  }

  async createInvitation({
    note,
    nickname,
  }: {
    note?: string;
    nickname?: string;
  }): Promise<SignedInvitation> {
    const messageId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

    const threadPair = await generateECDHKeyPair();

    const invitation: Invitation = {
      header: {
        alg: "ES256",
        jwk: this.jwk,
      },
      payload: {
        messageId,
        threadJWK: threadPair.jwk,
        note,
        nickname,
      },
    };
    this.storage.appendItem(`threads:${this.fingerprint}`, {
      fingerprint: threadPair.fingerprint,
    });

    const myPubKey = KEYUTIL.getKey(this.jwk);
    invariant(myPubKey, "Unable to get key");
    invariant(myPubKey instanceof KJUR.crypto.ECDSA, "Invalid key type");

    const signedInvite = KJUR.jws.JWS.sign(
      "ES256",
      JSON.stringify(invitation.header),
      JSON.stringify(invitation.payload),
      this.identityKey
    ) as SignedInvitation;

    const isValid = KJUR.jws.JWS.verify(signedInvite, myPubKey);
    invariant(isValid, "Error creating invite, invalid signature");
    this.verifyJWT(signedInvite);

    this.storage.setItem(`invitation:${threadPair.fingerprint}`, signedInvite);
    return signedInvite;
  }

  replyToInvitation(signedInvite: SignedInvitation, message: string) {
    this.verifyJWT(signedInvite);

    const threadPair = generatePrivateKeyPair();
    this.storage.appendItem(`threads:${this.fingerprint}`, {
      fingerprint: threadPair.fingerprint,
    });
    this.storage.setItem(`invitation:${threadPair.fingerprint}`, signedInvite);

    this.replyToThread(threadPair.fingerprint, message);
  }

  verifyJWT(jwt: string) {
    try {
      const oJwt = KJUR.jws.JWS.parse(jwt);
      const jwk = (oJwt.headerObj as any).jwk;
      invariant(jwk, "Missing JWK");

      const key = KEYUTIL.getKey(jwk);
      invariant(key, "Unable to get key");
      invariant(key instanceof KJUR.crypto.ECDSA, "Invalid key type");
      const isValid = KJUR.jws.JWS.verify(jwt, key);
      invariant(isValid, "Invalid signature");
    } catch (e: any) {
      throw new Error(`Error verifying JWT: ${e.message}`);
    }
  }

  async replyToThread(threadFingerprint: string, message: string) {
    const tmp = this.storage.getItem(`invitation:${threadFingerprint}`);
    invariant(tmp, `Thread not found ${threadFingerprint}`);
    this.verifyJWT(tmp);

    var parsedInvitation = KJUR.jws.JWS.parse(tmp);
    const payload = parsedInvitation.payloadObj as Invitation["payload"];

    invariant(payload.threadJWK, "Thread JWK not found");
    const fingerprint = KJUR.jws.JWS.getJWKthumbprint(payload.threadJWK);
    let id =
      this.storage.getItem(`messageId:${fingerprint}`) ?? payload.messageId;
    id++;
    if (id > Number.MAX_SAFE_INTEGER) {
      id = 1;
    }
    this.storage.setItem(`messageId:${fingerprint}`, id);

    const newMessage = {
      header: {
        alg: "HS256",
      },
      payload: {
        id,
        message,
      },
    };

    const threadKey = KEYUTIL.getKey(payload.threadJWK!);
    invariant(threadKey instanceof KJUR.crypto.ECDSA, "Invalid key type");

    console.log("before");
    const keyA = await convertToCryptoKey(this.identityKey);
    console.log({ keyA });
    const keyB = await convertToCryptoKey(threadKey);
    console.log({ keyB });
    const secret = await deriveSharedSecret(keyA, keyB);
    console.log({ secret });

    const encryptedMessage = KJUR.jws.JWS.sign(
      null,
      newMessage.header,
      newMessage.payload,
      {
        hex: ArrayBuffertohex(secret),
      }
    );

    this.storage.appendItem(`messages:${threadFingerprint}`, encryptedMessage);
    return newMessage;
  }
}

export function invariant<T>(condition: T, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function deriveSharedSecret(privateKey: CryptoKey, publicKey: CryptoKey) {
  return await window.crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    384
  );
}

async function generateECDHKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-384",
    },
    true,
    ["deriveKey", "deriveBits"]
  );
  const jwk = (await window.crypto.subtle.exportKey(
    "jwk",
    keyPair.publicKey
  )) as KJUR.jws.JWS.JsonWebKey;
  const fingerprint = KJUR.jws.JWS.getJWKthumbprint(jwk);

  return {
    privateKey: keyPair.privateKey,
    fingerprint,
    jwk,
  };
}
async function convertToCryptoKey(
  ecdsaKey: KJUR.crypto.ECDSA
): Promise<CryptoKey> {
  // Convert the ECDSA key to JWK format
  const jwk = KEYUTIL.getJWKFromKey(ecdsaKey);

  const pairHex = ecdsaKey.generateKeyPairHex();

  try {
    // Convert the JWK to a CryptoKey
    return await window.crypto.subtle.importKey(
      "raw",
      hextoArrayBuffer(pairHex.ecpubhex),
      {
        name: "ECDH",
        namedCurve: "P-384",
      },
      false,
      ["deriveBits"]
    );
  } catch (e: any) {
    throw new Error(`Error converting key to JWK: ${e.message}`);
  }
}
