/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  utf8tob64u,
  hextob64u,
  ArrayBuffertohex,
  b64utoutf8,
  hextoArrayBuffer,
  b64utohex,
  rstrtohex,
} from "jsrsasign";
import { setNickname } from "./index";
import {
  Invitation,
  ReplyMessage,
  SelfEncrypted,
  SignedInvitation,
  SignedReply,
  SignedSelfEncrypted,
  TaggedString,
} from "./types";

export const ecdhAlg = {
  name: "ECDH",
  namedCurve: "P-384",
} as const;
export const ecdsaAlg = {
  name: "ECDSA",
  namedCurve: "P-384",
} as const;
const ecdsaKeyUseages = ["sign", "verify"] as const;
export const ecdsaSignAlg = {
  name: "ECDSA",
  hash: { name: "SHA-384" },
} as const;

const keySymbol = Symbol("keySymbol");
type Visibility = "public" | "private";
type AlgorithmType = "ECDSA" | "ECDH";
type TaggedKey<T = [AlgorithmType, Visibility]> = CryptoKey & {
  [keySymbol]: T;
};
export type EncryptedPrivateKey<T = AlgorithmType> = TaggedString<
  [T, "private"]
>;
export type SymmetricKey = CryptoKey & { [keySymbol]: "AES-GCM" };

export type ECDHCryptoKey<V = Visibility> = TaggedKey<["ECDH", V]>;
export type ECDSACryptoKey<V = Visibility> = TaggedKey<["ECDSA", V]>;
export type TaggedCryptoKeyPair<T = AlgorithmType> = {
  publicKey: TaggedKey<[T, "public"]>;
  privateKey: TaggedKey<[T, "private"]>;
};
export type ECDSACryptoKeyPair = TaggedCryptoKeyPair<"ECDSA">;
export type ECDHCryptoKeyPair = TaggedCryptoKeyPair<"ECDH">;

export type JWK<T = "ECDSA" | "ECDH", V = Visibility> = JsonWebKey & {
  [keySymbol]: [T, V];
};
export type Thumbprint<T = AlgorithmType> = string & {
  [keySymbol]: T;
};

export async function generateECDSAKeyPair() {
  const keyPair = (await window.crypto.subtle.generateKey(
    ecdsaAlg,
    true,
    ecdsaKeyUseages
  )) as ECDSACryptoKeyPair;
  const thumbprint = await getJWKthumbprint(await exportKey(keyPair.publicKey));
  setNickname(thumbprint, `${thumbprint}/ECDSA`);

  return keyPair;
}
export async function generateECDHKeyPair() {
  const keyPair = (await window.crypto.subtle.generateKey(ecdhAlg, true, [
    "deriveKey",
    "deriveBits",
  ])) as ECDHCryptoKeyPair;
  const thumbprint = await getJWKthumbprint(await exportKey(keyPair.publicKey));
  setNickname(thumbprint, `${thumbprint}/ECDH`);

  return keyPair;
}
export function invariant<T>(condition: T, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export async function deriveSharedSecret(
  privateKey: TaggedKey<["ECDH", "private"]>,
  publicKey: TaggedKey<["ECDH", "public"]>
): Promise<SymmetricKey> {
  const bits = await window.crypto.subtle.deriveBits(
    {
      name: ecdhAlg.name,
      public: publicKey,
    },
    privateKey,
    256
  );
  return (await window.crypto.subtle.importKey(
    "raw",
    bits,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  )) as SymmetricKey;
}
export async function signJWS(
  header: object,
  payload: object,
  privateKey: ECDSACryptoKey<"private">
): Promise<string> {
  const encodedHeader = utf8tob64u(JSON.stringify(header));
  const encodedPayload = utf8tob64u(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = await window.crypto.subtle.sign(
    ecdsaSignAlg,
    privateKey,
    new TextEncoder().encode(dataToSign)
  );

  // Step 5: Encode the signature
  const encodedSignature = hextob64u(ArrayBuffertohex(signature));

  // Step 6: Concatenate the encoded parts
  const jws = `${dataToSign}.${encodedSignature}`;

  return jws;
}
export async function verifyJWS(
  jws: string,
  pubKey?: ECDSACryptoKey<"public">
): Promise<boolean> {
  const [header, payload, signature] = jws.split(".");
  const signedData = `${header}.${payload}`;

  if (!pubKey) {
    let headerObj;
    try {
      headerObj = JSON.parse(b64utoutf8(header));
    } catch (e) {
      // ignore JSON parse errors
    }
    if (headerObj && "jwk" in headerObj && typeof headerObj.jwk === "object") {
      const pubKey = await importPublicKey<"ECDSA">("ECDSA", headerObj.jwk);
      return verifyJWS(jws, pubKey);
    }
    return false;
  }

  const isValid = await window.crypto.subtle.verify(
    { name: ecdsaAlg.name, hash: { name: "SHA-384" } },
    pubKey,
    hextoArrayBuffer(b64utohex(signature)),
    new TextEncoder().encode(signedData)
  );
  return isValid;
}
export async function getJWKthumbprint<T = AlgorithmType>(
  jwk: JWK<T, any>
): Promise<Thumbprint<T>> {
  invariant(jwk.kty === "EC", "Unsupported key type");
  const s = {
    crf: jwk.crv,
    kty: jwk.kty,
    x: jwk.x,
    y: jwk.y,
  };
  const hex = rstrtohex(JSON.stringify(s));
  const sha256 = await window.crypto.subtle.digest(
    "SHA-256",
    hextoArrayBuffer(hex)
  );
  const alg = jwk.alg ? `${jwk.alg}/` : "";

  return `id-${alg}${hextob64u(ArrayBuffertohex(sha256))}` as any;
}

export function exportKey<T = AlgorithmType, V = Visibility>(
  key: TaggedKey<[T, V]>
) {
  return window.crypto.subtle.exportKey("jwk", key) as Promise<JWK<T, V>>;
}

export async function exportKeyPair<T = AlgorithmType>(
  keyPair: TaggedCryptoKeyPair<T>
) {
  const privateKeyJWK = await exportKey(keyPair.privateKey);
  const publicKeyJWK = await exportKey(keyPair.publicKey);
  return { privateKeyJWK, publicKeyJWK };
}
export async function encryptPrivateKey<T = AlgorithmType>(
  privateKeyJWK: JWK<T, "private">,
  password: string
): Promise<EncryptedPrivateKey<T>> {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const privateKeyString = JSON.stringify(privateKeyJWK);
  const encryptedPrivateKey = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    keyMaterial,
    enc.encode(privateKeyString)
  );

  return [
    Buffer.from(encryptedPrivateKey).toString("base64"),
    Buffer.from(iv).toString("base64"),
    Buffer.from(salt).toString("base64"),
  ].join(".") as EncryptedPrivateKey<T>;
}
export async function decryptPrivateKey<T = AlgorithmType>(
  str: TaggedString<[T, "private"]>,
  password: string
): Promise<JWK<T, "private">> {
  const [encryptedPrivateKey, iv, salt] = str
    .split(".")
    .map((b64) => Uint8Array.from(Buffer.from(b64, "base64")));
  invariant(encryptedPrivateKey && iv && salt, "Invalid encrypted private key");
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const keyMaterial = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const decryptedPrivateKey = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    keyMaterial,
    encryptedPrivateKey
  );

  const privateKeyJWK = JSON.parse(
    new TextDecoder().decode(decryptedPrivateKey)
  );
  return privateKeyJWK;
}
export async function parseJWS<
  T extends { header: unknown; payload: unknown },
  J extends
    | string
    | SignedInvitation
    | SignedReply
    | SignedSelfEncrypted = string
>(
  jws: J,
  pubKey?: ECDSACryptoKey<"public"> | null
): Promise<
  J extends SignedInvitation
    ? Invitation
    : J extends SignedReply
    ? ReplyMessage
    : J extends SignedSelfEncrypted
    ? SelfEncrypted
    : T
> {
  if (pubKey !== null) {
    const isValid = await verifyJWS(jws, pubKey);
    if (!isValid) {
      throw new Error(`JWS verification failed`);
    }
  }

  const [encodedHeader, encodedPayload] = jws.split(".");
  const header = JSON.parse(b64utoutf8(encodedHeader));
  const payload = JSON.parse(b64utoutf8(encodedPayload));

  return { header, payload } as any;
}

export async function importPrivateKey<T = AlgorithmType>(
  type: T,
  jwk: JWK<T, "private">
): Promise<TaggedKey<[T, "private"]>> {
  return (await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    type === "ECDH" ? ecdhAlg : ecdsaAlg,
    true,
    type === "ECDH" ? ["deriveKey", "deriveBits"] : ["sign"]
  )) as TaggedKey<[T, "private"]>;
}
export async function importPublicKey<T = AlgorithmType>(
  type: T,
  jwk: JWK<T, "public">
): Promise<TaggedKey<[T, "public"]>> {
  return (await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    type === "ECDH" ? ecdhAlg : ecdsaAlg,
    true,
    type === "ECDH" ? [] : ["verify"]
  )) as TaggedKey<[T, "public"]>;
}

export async function importKeyPair<T = AlgorithmType>(
  t: {
    privateKeyJWK: JWK<T, "private">;
    publicKeyJWK: JWK<T, "public">;
  },
  type: "ecdsa" | "ecdh" = "ecdh"
): Promise<{
  privateKey: TaggedKey<[T, "private"]>;
  publicKey: TaggedKey<[T, "public"]>;
}> {
  return {
    privateKey: (await window.crypto.subtle.importKey(
      "jwk",
      t.privateKeyJWK,
      type === "ecdh" ? ecdhAlg : ecdsaAlg,
      true,
      type === "ecdh" ? ["deriveKey", "deriveBits"] : ["sign"]
    )) as TaggedKey<[T, "private"]>,
    publicKey: (await window.crypto.subtle.importKey(
      "jwk",
      t.publicKeyJWK,
      type === "ecdh" ? ecdhAlg : ecdsaAlg,
      true,
      type === "ecdh" ? [] : ["verify"]
    )) as TaggedKey<[T, "public"]>,
  };
}
