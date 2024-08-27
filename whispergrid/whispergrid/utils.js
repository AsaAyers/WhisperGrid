"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecdsaSignAlg = exports.ecdsaAlg = exports.ecdhAlg = exports.bufferToB64u = exports.b64uToBuffer = void 0;
exports.generateECDSAKeyPair = generateECDSAKeyPair;
exports.generateECDHKeyPair = generateECDHKeyPair;
exports.invariant = invariant;
exports.deriveSharedSecret = deriveSharedSecret;
exports.signJWS = signJWS;
exports.verifyJWS = verifyJWS;
exports.getJWKthumbprint = getJWKthumbprint;
exports.exportKey = exportKey;
exports.exportKeyPair = exportKeyPair;
exports.encryptPrivateKey = encryptPrivateKey;
exports.decryptPrivateKey = decryptPrivateKey;
exports.parseJWS = parseJWS;
exports.parseJWSSync = parseJWSSync;
exports.importPrivateKey = importPrivateKey;
exports.importPublicKey = importPublicKey;
exports.importKeyPair = importKeyPair;
exports.encryptData = encryptData;
exports.decryptData = decryptData;
/* eslint-disable @typescript-eslint/no-explicit-any */
const jsrsasign_1 = require("jsrsasign");
const index_1 = require("./index");
const b64uToBuffer = (str) => Buffer.from(str.replace("-", "+").replace("_", "/"), "base64");
exports.b64uToBuffer = b64uToBuffer;
const bufferToB64u = (src) => Buffer.from(src)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
exports.bufferToB64u = bufferToB64u;
exports.ecdhAlg = {
    name: "ECDH",
    namedCurve: "P-384",
};
exports.ecdsaAlg = {
    name: "ECDSA",
    namedCurve: "P-384",
};
const ecdsaKeyUseages = ["sign", "verify"];
exports.ecdsaSignAlg = {
    name: "ECDSA",
    hash: { name: "SHA-384" },
};
const keySymbol = Symbol("keySymbol");
async function generateECDSAKeyPair() {
    const keyPair = (await window.crypto.subtle.generateKey(exports.ecdsaAlg, true, ecdsaKeyUseages));
    const thumbprint = await getJWKthumbprint(await exportKey(keyPair.publicKey));
    (0, index_1.setNickname)(thumbprint, `${thumbprint}/ECDSA`);
    return keyPair;
}
async function generateECDHKeyPair() {
    const keyPair = (await window.crypto.subtle.generateKey(exports.ecdhAlg, true, [
        "deriveKey",
        "deriveBits",
    ]));
    const thumbprint = await getJWKthumbprint(await exportKey(keyPair.publicKey));
    (0, index_1.setNickname)(thumbprint, `${thumbprint}/ECDH`);
    return keyPair;
}
function invariant(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
async function deriveSharedSecret(privateKey, publicKey) {
    const bits = await window.crypto.subtle.deriveBits({
        name: exports.ecdhAlg.name,
        public: publicKey,
    }, privateKey, 256);
    return (await window.crypto.subtle.importKey("raw", bits, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]));
}
async function signJWS(header, payload, privateKey) {
    const unixTimetsamp = Math.floor(Date.now() / 1000);
    header.iat = unixTimetsamp;
    const encodedHeader = (0, jsrsasign_1.utf8tob64u)(JSON.stringify(header));
    const encodedPayload = (0, jsrsasign_1.utf8tob64u)(typeof payload === "string" ? payload : JSON.stringify(payload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const signature = await window.crypto.subtle.sign(exports.ecdsaSignAlg, privateKey, new TextEncoder().encode(dataToSign));
    // Step 5: Encode the signature
    const encodedSignature = (0, jsrsasign_1.hextob64u)((0, jsrsasign_1.ArrayBuffertohex)(signature));
    // Step 6: Concatenate the encoded parts
    const jws = `${dataToSign}.${encodedSignature}`;
    return jws;
}
async function verifyJWS(jws, pubKey) {
    if (jws.startsWith('"') && jws.endsWith('"')) {
        jws = jws.slice(1, -1);
    }
    const [header, payload, signature] = jws.split(".");
    const signedData = `${header}.${payload}`;
    if (!pubKey) {
        let headerObj;
        try {
            headerObj = JSON.parse((0, jsrsasign_1.b64utoutf8)(header));
        }
        catch (e) {
            // ignore JSON parse errors
        }
        if (headerObj && "jwk" in headerObj && typeof headerObj.jwk === "object") {
            const pubKey = await importPublicKey("ECDSA", headerObj.jwk);
            return verifyJWS(jws, pubKey);
        }
        return false;
    }
    if ("kty" in pubKey) {
        pubKey = await importPublicKey("ECDSA", pubKey);
    }
    const isValid = await window.crypto.subtle.verify({ name: exports.ecdsaAlg.name, hash: { name: "SHA-384" } }, pubKey, (0, jsrsasign_1.hextoArrayBuffer)((0, jsrsasign_1.b64utohex)(signature)), new TextEncoder().encode(signedData));
    return isValid;
}
async function getJWKthumbprint(jwk) {
    invariant(jwk.kty === "EC", "Unsupported key type");
    const s = {
        crf: jwk.crv,
        kty: jwk.kty,
        x: jwk.x,
        y: jwk.y,
    };
    const hex = (0, jsrsasign_1.rstrtohex)(JSON.stringify(s));
    const sha256 = await window.crypto.subtle.digest("SHA-256", (0, jsrsasign_1.hextoArrayBuffer)(hex));
    return `id-${(0, jsrsasign_1.hextob64u)((0, jsrsasign_1.ArrayBuffertohex)(sha256))}`;
}
function exportKey(key) {
    return window.crypto.subtle.exportKey("jwk", key);
}
async function exportKeyPair(keyPair) {
    const privateKeyJWK = await exportKey(keyPair.privateKey);
    const publicKeyJWK = await exportKey(keyPair.publicKey);
    return { privateKeyJWK, publicKeyJWK };
}
async function encryptPrivateKey(privateKeyJWK, password) {
    const enc = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await window.crypto.subtle.deriveKey({
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
    }, passwordKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const privateKeyString = JSON.stringify(privateKeyJWK);
    const encryptedPrivateKey = await window.crypto.subtle.encrypt({
        name: "AES-GCM",
        iv: iv,
    }, keyMaterial, enc.encode(privateKeyString));
    return [
        Buffer.from(encryptedPrivateKey).toString("base64"),
        Buffer.from(iv).toString("base64"),
        Buffer.from(salt).toString("base64"),
    ].join(".");
}
async function decryptPrivateKey(str, password) {
    const [encryptedPrivateKey, iv, salt] = str
        .split(".")
        .map((b64) => Uint8Array.from(Buffer.from(b64, "base64")));
    invariant(encryptedPrivateKey && iv && salt, "Invalid encrypted private key");
    const enc = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
    const keyMaterial = await window.crypto.subtle.deriveKey({
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
    }, passwordKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    const decryptedPrivateKey = await window.crypto.subtle.decrypt({
        name: "AES-GCM",
        iv: iv,
    }, keyMaterial, encryptedPrivateKey);
    const privateKeyJWK = JSON.parse(new TextDecoder().decode(decryptedPrivateKey));
    return privateKeyJWK;
}
async function parseJWS(jws, pubKey) {
    if (pubKey !== null) {
        const isValid = await verifyJWS(jws, pubKey);
        invariant(isValid, `JWS verification failed`);
    }
    return parseJWSSync(jws);
}
function parseJWSSync(jws) {
    invariant(typeof jws === "string", "Expected a string");
    if (jws.startsWith('"') && jws.endsWith('"')) {
        jws = jws.slice(1, -1);
    }
    const [encodedHeader, encodedPayload] = jws.split(".");
    const header = JSON.parse((0, jsrsasign_1.b64utoutf8)(encodedHeader));
    let payload = (0, jsrsasign_1.b64utoutf8)(encodedPayload);
    try {
        payload = JSON.parse(payload);
    }
    catch (e) {
        // ignore JSON parse errors
    }
    return { header, payload };
}
async function importPrivateKey(type, jwk) {
    return (await window.crypto.subtle.importKey("jwk", jwk, type === "ECDH" ? exports.ecdhAlg : exports.ecdsaAlg, true, type === "ECDH" ? ["deriveKey", "deriveBits"] : ["sign"]));
}
async function importPublicKey(type, jwk) {
    return (await window.crypto.subtle.importKey("jwk", jwk, type === "ECDH" ? exports.ecdhAlg : exports.ecdsaAlg, true, type === "ECDH" ? [] : ["verify"]));
}
async function importKeyPair(t, type = "ecdh") {
    return {
        privateKey: (await window.crypto.subtle.importKey("jwk", t.privateKeyJWK, type === "ecdh" ? exports.ecdhAlg : exports.ecdsaAlg, true, type === "ecdh" ? ["deriveKey", "deriveBits"] : ["sign"])),
        publicKey: (await window.crypto.subtle.importKey("jwk", t.publicKeyJWK, type === "ecdh" ? exports.ecdhAlg : exports.ecdsaAlg, true, type === "ecdh" ? [] : ["verify"])),
    };
}
const MIN_MESSAGE_SIZE = 30;
async function encryptData(secret, message) {
    try {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        let msg = JSON.stringify({
            m: message,
        });
        if (msg.length < MIN_MESSAGE_SIZE) {
            msg = JSON.stringify({
                random: (0, jsrsasign_1.ArrayBuffertohex)(window.crypto.getRandomValues(new Uint8Array(MIN_MESSAGE_SIZE / 2))
                    .buffer),
                m: message,
            });
        }
        const encrypted = await window.crypto.subtle.encrypt({
            name: "AES-GCM",
            iv,
        }, secret, new TextEncoder().encode(msg));
        return {
            iv: Buffer.from(iv).toString("base64"),
            encrypted: (0, exports.bufferToB64u)(encrypted),
        };
    }
    catch (e) {
        throw new Error("Failed to encrypt " + e?.message);
    }
}
async function decryptData(secret, iv, encryptedPayload) {
    try {
        const payloadBuffer = await window.crypto.subtle.decrypt({
            name: "AES-GCM",
            iv: (0, exports.b64uToBuffer)(iv),
        }, secret, (0, exports.b64uToBuffer)(encryptedPayload));
        const decoded = new TextDecoder().decode(payloadBuffer);
        const decrypted = JSON.parse(decoded);
        return (decrypted?.m ?? decrypted);
    }
    catch (e) {
        throw new Error("Failed to decrypt " + e?.message);
    }
}
