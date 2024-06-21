import {
  utf8tob64u,
  hextob64u,
  ArrayBuffertohex,
  b64utoutf8,
  hextoArrayBuffer,
  b64utohex,
  rstrtohex,
} from "jsrsasign";
import { getNickname, setNickname } from ".";

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
export async function generateECDSAKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    ecdsaAlg,
    true,
    ecdsaKeyUseages
  );
  const thumbprint = await getJWKthumbprint(
    await window.crypto.subtle.exportKey("jwk", keyPair.publicKey)
  );
  setNickname(thumbprint, `${thumbprint}/ECDSA`);

  return keyPair;
}
export async function generateECDHKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(ecdhAlg, true, [
    "deriveKey",
    "deriveBits",
  ]);
  const thumbprint = await getJWKthumbprint(
    await window.crypto.subtle.exportKey("jwk", keyPair.publicKey)
  );
  setNickname(thumbprint, `${thumbprint}/ECDH`);

  return keyPair;
}
export function invariant<T>(condition: T, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  const bits = await window.crypto.subtle.deriveBits(
    {
      name: ecdhAlg.name,
      public: publicKey,
    },
    privateKey,
    256
  );
  return await window.crypto.subtle.importKey(
    "raw",
    bits,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}
export async function signJWS(
  header: object,
  payload: object,
  privateKey: CryptoKey
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
  pubKey?: CryptoKey
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
      const pubKey = await window.crypto.subtle.importKey(
        "jwk",
        headerObj.jwk,
        ecdsaAlg,
        true,
        ["verify"]
      );
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
export async function getJWKthumbprint(jwk: JsonWebKey) {
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
  let alg = jwk.alg ? `${jwk.alg}/` : "";

  return `whisper-grid://${alg}${hextob64u(ArrayBuffertohex(sha256))}`;
}

export async function exportKeyPair(keyPair: CryptoKeyPair) {
  const privateKeyJWK = await window.crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey
  );
  const publicKeyJWK = await window.crypto.subtle.exportKey(
    "jwk",
    keyPair.publicKey
  );
  return { privateKeyJWK, publicKeyJWK };
}
export async function encryptPrivateKey(
  privateKeyJWK: JsonWebKey,
  password: string
) {
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
  ].join(".");
}
export async function decryptPrivateKey(
  str: string,
  password: string
): Promise<JsonWebKey> {
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
export async function parseJWS<T extends { header: unknown; payload: unknown }>(
  jws: string,
  pubKey?: CryptoKey | null
): Promise<T> {
  if (pubKey !== null) {
    const isValid = await verifyJWS(jws, pubKey);
    if (!isValid) {
      throw new Error(`JWS verification failed`);
    }
  }

  const [encodedHeader, encodedPayload] = jws.split(".");
  const header = JSON.parse(b64utoutf8(encodedHeader));
  const payload = JSON.parse(b64utoutf8(encodedPayload));

  return { header, payload } as T;
}

export async function importKeyPair<
  T extends {
    privateKeyJWK: JsonWebKey;
    publicKeyJWK: JsonWebKey;
  }
>(
  t: T,
  type: "ecdsa" | "ecdh" = "ecdh"
): Promise<{
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}> {
  return {
    privateKey: await window.crypto.subtle.importKey(
      "jwk",
      t.privateKeyJWK,
      type === "ecdh" ? ecdhAlg : ecdsaAlg,
      true,
      type === "ecdh" ? ["deriveKey", "deriveBits"] : ["sign"]
    ),
    publicKey: await window.crypto.subtle.importKey(
      "jwk",
      t.publicKeyJWK,
      type === "ecdh" ? ecdhAlg : ecdsaAlg,
      true,
      type === "ecdh" ? [] : ["verify"]
    ),
  };
}
