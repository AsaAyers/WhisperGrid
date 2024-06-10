import { KEYUTIL, KJUR, ArrayBuffertohex } from "jsrsasign";

import { GridStorage } from "./GridStorage";
import {
  JsonWebKey,
  TaggedString,
  SignedInvitation,
  Invitation,
} from "./types";

function generatePrivateKeyPair() {
  const key = KEYUTIL.generateKeypair("EC", "secp384r1");
  const jwk = KEYUTIL.getJWKFromKey(key.pubKeyObj);
  const fingerprint = KJUR.jws.JWS.getJWKthumbprint(jwk);

  KEYUTIL.getJWKFromKey;

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
    this.jwk = KEYUTIL.getJWKFromKey(key);
    this.identityKey = key;
  }

  toString() {
    return this.pem;
  }

  createInvitation({
    note,
    nickname,
  }: {
    note?: string;
    nickname?: string;
  }): SignedInvitation {
    const messageId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

    const threadPair = generatePrivateKeyPair();

    const invitation: Invitation = {
      header: {
        alg: "RS256",
        jwk: this.jwk,
      },
      payload: {
        messageId,
        // threadJWK: threadPair.jwk,
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
      "RS256",
      JSON.stringify(invitation.header),
      JSON.stringify(invitation.payload),
      this.identityKey
    ) as SignedInvitation;
    console.log("signedInvite", signedInvite);

    // const isValid = KJUR.jws.JWS.verifyJWT(signedInvite, myPubKey, {
    //   alg: ["HS256"],
    // });
    // invariant(isValid, "Error creating invite, invalid signature");

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
    const isValid = KJUR.jws.JWS.verifyJWT(jwt, "", { alg: ["HS256"] });
    invariant(isValid, "Invalid signature");
  }

  async replyToThread(threadFingerprint: string, message: string) {
    const tmp = this.storage.getItem(`invitation:${threadFingerprint}`);
    invariant(tmp, `Thread not found ${threadFingerprint}`);
    this.verifyJWT(tmp);

    var parsedInvitation = KJUR.jws.JWS.parse(tmp);
    const payload = parsedInvitation.payloadObj as Invitation["payload"];

    const fingerprint = KJUR.jws.JWS.getJWKthumbprint(payload.threadJWK!);
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

    const secret = await deriveSharedSecret(
      await convertToCryptoKey(this.identityKey),
      await convertToCryptoKey(threadKey)
    );

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
    256
  );
}

function convertToCryptoKey(ecdsaKey: KJUR.crypto.ECDSA): Promise<CryptoKey> {
  // Convert the ECDSA key to JWK format
  const jwk = KEYUTIL.getJWKFromKey(ecdsaKey);

  // Convert the JWK to a CryptoKey
  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDSA",
      namedCurve: "P-256", // This should match the curve used in your ECDSA key
    },
    true,
    ["sign", "verify"] // Adjust these as needed
  );
}
