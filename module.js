import {Buffer as $hxj1O$Buffer} from "buffer";
import {ArrayBuffertohex as $hxj1O$ArrayBuffertohex, utf8tob64u as $hxj1O$utf8tob64u, hextob64u as $hxj1O$hextob64u, b64utoutf8 as $hxj1O$b64utoutf8, hextoArrayBuffer as $hxj1O$hextoArrayBuffer, b64utohex as $hxj1O$b64utohex, rstrtohex as $hxj1O$rstrtohex} from "jsrsasign";

/* eslint-disable @typescript-eslint/no-explicit-any */ /* eslint-disable @typescript-eslint/no-explicit-any */ /* eslint-disable @typescript-eslint/no-explicit-any */ 


var $0896b07150fdbaad$require$Buffer = $hxj1O$Buffer;
const $0896b07150fdbaad$export$9727364c1216843b = (str)=>$0896b07150fdbaad$require$Buffer.from(str.replace("-", "+").replace("_", "/"), "base64");
const $0896b07150fdbaad$export$956a7f8e09e7a04 = (src)=>$0896b07150fdbaad$require$Buffer.from(src).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
const $0896b07150fdbaad$export$1b0a11badccb060e = {
    name: "ECDH",
    namedCurve: "P-384"
};
const $0896b07150fdbaad$export$593cf972133c6bfa = {
    name: "ECDSA",
    namedCurve: "P-384"
};
const $0896b07150fdbaad$var$ecdsaKeyUseages = [
    "sign",
    "verify"
];
const $0896b07150fdbaad$export$a46aded5c6aac828 = {
    name: "ECDSA",
    hash: {
        name: "SHA-384"
    }
};
const $0896b07150fdbaad$var$keySymbol = Symbol("keySymbol");
async function $0896b07150fdbaad$export$30269e8f0eedc10a() {
    const keyPair = await window.crypto.subtle.generateKey($0896b07150fdbaad$export$593cf972133c6bfa, true, $0896b07150fdbaad$var$ecdsaKeyUseages);
    const thumbprint = await $0896b07150fdbaad$export$d223eef5bee92cf8(await $0896b07150fdbaad$export$96341dfa0e2e9076(keyPair.publicKey));
    (0, $2a29acee125cb879$export$89cea9803cad95d2)(thumbprint, `${thumbprint}/ECDSA`);
    return keyPair;
}
async function $0896b07150fdbaad$export$b1dda1088d254686() {
    const keyPair = await window.crypto.subtle.generateKey($0896b07150fdbaad$export$1b0a11badccb060e, true, [
        "deriveKey",
        "deriveBits"
    ]);
    const thumbprint = await $0896b07150fdbaad$export$d223eef5bee92cf8(await $0896b07150fdbaad$export$96341dfa0e2e9076(keyPair.publicKey));
    (0, $2a29acee125cb879$export$89cea9803cad95d2)(thumbprint, `${thumbprint}/ECDH`);
    return keyPair;
}
function $0896b07150fdbaad$export$f5708dca728d7177(condition, message) {
    if (!condition) throw new Error(message);
}
async function $0896b07150fdbaad$export$d8c619be39dc35fe(privateKey, publicKey) {
    const bits = await window.crypto.subtle.deriveBits({
        name: $0896b07150fdbaad$export$1b0a11badccb060e.name,
        public: publicKey
    }, privateKey, 256);
    return await window.crypto.subtle.importKey("raw", bits, {
        name: "AES-GCM"
    }, false, [
        "encrypt",
        "decrypt"
    ]);
}
async function $0896b07150fdbaad$export$d71a6df60c6808b(header, payload, privateKey) {
    const unixTimetsamp = Math.floor(Date.now() / 1000);
    header.iat = unixTimetsamp;
    const encodedHeader = (0, $hxj1O$utf8tob64u)(JSON.stringify(header));
    const encodedPayload = (0, $hxj1O$utf8tob64u)(typeof payload === "string" ? payload : JSON.stringify(payload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const signature = await window.crypto.subtle.sign($0896b07150fdbaad$export$a46aded5c6aac828, privateKey, new TextEncoder().encode(dataToSign));
    // Step 5: Encode the signature
    const encodedSignature = (0, $hxj1O$hextob64u)((0, $hxj1O$ArrayBuffertohex)(signature));
    // Step 6: Concatenate the encoded parts
    const jws = `${dataToSign}.${encodedSignature}`;
    return jws;
}
async function $0896b07150fdbaad$export$bcc5355044a25ec(jws, pubKey) {
    if (jws.startsWith('"') && jws.endsWith('"')) jws = jws.slice(1, -1);
    const [header, payload, signature] = jws.split(".");
    const signedData = `${header}.${payload}`;
    if (!pubKey) {
        let headerObj;
        try {
            headerObj = JSON.parse((0, $hxj1O$b64utoutf8)(header));
        } catch (e) {
        // ignore JSON parse errors
        }
        if (headerObj && "jwk" in headerObj && typeof headerObj.jwk === "object") {
            const pubKey = await $0896b07150fdbaad$export$f7283e97187223bd("ECDSA", headerObj.jwk);
            return $0896b07150fdbaad$export$bcc5355044a25ec(jws, pubKey);
        }
        return false;
    }
    if ("kty" in pubKey) pubKey = await $0896b07150fdbaad$export$f7283e97187223bd("ECDSA", pubKey);
    const isValid = await window.crypto.subtle.verify({
        name: $0896b07150fdbaad$export$593cf972133c6bfa.name,
        hash: {
            name: "SHA-384"
        }
    }, pubKey, (0, $hxj1O$hextoArrayBuffer)((0, $hxj1O$b64utohex)(signature)), new TextEncoder().encode(signedData));
    return isValid;
}
async function $0896b07150fdbaad$export$d223eef5bee92cf8(jwk) {
    $0896b07150fdbaad$export$f5708dca728d7177(jwk.kty === "EC", "Unsupported key type");
    const s = {
        crf: jwk.crv,
        kty: jwk.kty,
        x: jwk.x,
        y: jwk.y
    };
    const hex = (0, $hxj1O$rstrtohex)(JSON.stringify(s));
    const sha256 = await window.crypto.subtle.digest("SHA-256", (0, $hxj1O$hextoArrayBuffer)(hex));
    return `id-${(0, $hxj1O$hextob64u)((0, $hxj1O$ArrayBuffertohex)(sha256))}`;
}
function $0896b07150fdbaad$export$96341dfa0e2e9076(key) {
    return window.crypto.subtle.exportKey("jwk", key);
}
async function $0896b07150fdbaad$export$87d43765c0bdfdff(keyPair) {
    const privateKeyJWK = await $0896b07150fdbaad$export$96341dfa0e2e9076(keyPair.privateKey);
    const publicKeyJWK = await $0896b07150fdbaad$export$96341dfa0e2e9076(keyPair.publicKey);
    return {
        privateKeyJWK: privateKeyJWK,
        publicKeyJWK: publicKeyJWK
    };
}
async function $0896b07150fdbaad$export$4f5b87a5ef040005(privateKeyJWK, password) {
    const enc = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey("raw", enc.encode(password), {
        name: "PBKDF2"
    }, false, [
        "deriveKey"
    ]);
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await window.crypto.subtle.deriveKey({
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
    }, passwordKey, {
        name: "AES-GCM",
        length: 256
    }, false, [
        "encrypt",
        "decrypt"
    ]);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const privateKeyString = JSON.stringify(privateKeyJWK);
    const encryptedPrivateKey = await window.crypto.subtle.encrypt({
        name: "AES-GCM",
        iv: iv
    }, keyMaterial, enc.encode(privateKeyString));
    return [
        $0896b07150fdbaad$require$Buffer.from(encryptedPrivateKey).toString("base64"),
        $0896b07150fdbaad$require$Buffer.from(iv).toString("base64"),
        $0896b07150fdbaad$require$Buffer.from(salt).toString("base64")
    ].join(".");
}
async function $0896b07150fdbaad$export$c97f585acdba2853(str, password) {
    const [encryptedPrivateKey, iv, salt] = str.split(".").map((b64)=>Uint8Array.from($0896b07150fdbaad$require$Buffer.from(b64, "base64")));
    $0896b07150fdbaad$export$f5708dca728d7177(encryptedPrivateKey && iv && salt, "Invalid encrypted private key");
    const enc = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey("raw", enc.encode(password), {
        name: "PBKDF2"
    }, false, [
        "deriveKey"
    ]);
    const keyMaterial = await window.crypto.subtle.deriveKey({
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
    }, passwordKey, {
        name: "AES-GCM",
        length: 256
    }, false, [
        "encrypt",
        "decrypt"
    ]);
    const decryptedPrivateKey = await window.crypto.subtle.decrypt({
        name: "AES-GCM",
        iv: iv
    }, keyMaterial, encryptedPrivateKey);
    const privateKeyJWK = JSON.parse(new TextDecoder().decode(decryptedPrivateKey));
    return privateKeyJWK;
}
async function $0896b07150fdbaad$export$99859bc1ea511bf9(jws, pubKey) {
    if (pubKey !== null) {
        const isValid = await $0896b07150fdbaad$export$bcc5355044a25ec(jws, pubKey);
        $0896b07150fdbaad$export$f5708dca728d7177(isValid, `JWS verification failed`);
    }
    return $0896b07150fdbaad$export$56ce858a5181ed60(jws);
}
function $0896b07150fdbaad$export$56ce858a5181ed60(jws) {
    $0896b07150fdbaad$export$f5708dca728d7177(typeof jws === "string", "Expected a string");
    if (jws.startsWith('"') && jws.endsWith('"')) jws = jws.slice(1, -1);
    const [encodedHeader, encodedPayload] = jws.split(".");
    const header = JSON.parse((0, $hxj1O$b64utoutf8)(encodedHeader));
    let payload = (0, $hxj1O$b64utoutf8)(encodedPayload);
    try {
        payload = JSON.parse(payload);
    } catch (e) {
    // ignore JSON parse errors
    }
    return {
        header: header,
        payload: payload
    };
}
async function $0896b07150fdbaad$export$a130e185e3431961(type, jwk) {
    return await window.crypto.subtle.importKey("jwk", jwk, type === "ECDH" ? $0896b07150fdbaad$export$1b0a11badccb060e : $0896b07150fdbaad$export$593cf972133c6bfa, true, type === "ECDH" ? [
        "deriveKey",
        "deriveBits"
    ] : [
        "sign"
    ]);
}
async function $0896b07150fdbaad$export$f7283e97187223bd(type, jwk) {
    return await window.crypto.subtle.importKey("jwk", jwk, type === "ECDH" ? $0896b07150fdbaad$export$1b0a11badccb060e : $0896b07150fdbaad$export$593cf972133c6bfa, true, type === "ECDH" ? [] : [
        "verify"
    ]);
}
async function $0896b07150fdbaad$export$57926b65d55505fc(t, type = "ecdh") {
    return {
        privateKey: await window.crypto.subtle.importKey("jwk", t.privateKeyJWK, type === "ecdh" ? $0896b07150fdbaad$export$1b0a11badccb060e : $0896b07150fdbaad$export$593cf972133c6bfa, true, type === "ecdh" ? [
            "deriveKey",
            "deriveBits"
        ] : [
            "sign"
        ]),
        publicKey: await window.crypto.subtle.importKey("jwk", t.publicKeyJWK, type === "ecdh" ? $0896b07150fdbaad$export$1b0a11badccb060e : $0896b07150fdbaad$export$593cf972133c6bfa, true, type === "ecdh" ? [] : [
            "verify"
        ])
    };
}
const $0896b07150fdbaad$var$MIN_MESSAGE_SIZE = 30;
async function $0896b07150fdbaad$export$cfb0e8a6f536315e(secret, message) {
    try {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        let msg = JSON.stringify({
            m: message
        });
        if (msg.length < $0896b07150fdbaad$var$MIN_MESSAGE_SIZE) msg = JSON.stringify({
            random: (0, $hxj1O$ArrayBuffertohex)(window.crypto.getRandomValues(new Uint8Array($0896b07150fdbaad$var$MIN_MESSAGE_SIZE / 2)).buffer),
            m: message
        });
        const encrypted = await window.crypto.subtle.encrypt({
            name: "AES-GCM",
            iv: iv
        }, secret, new TextEncoder().encode(msg));
        return {
            iv: $0896b07150fdbaad$require$Buffer.from(iv).toString("base64"),
            encrypted: $0896b07150fdbaad$export$956a7f8e09e7a04(encrypted)
        };
    } catch (e) {
        throw new Error("Failed to encrypt " + e?.message);
    }
}
async function $0896b07150fdbaad$export$989b3bbdce9ac2d4(secret, iv, encryptedPayload) {
    try {
        const payloadBuffer = await window.crypto.subtle.decrypt({
            name: "AES-GCM",
            iv: $0896b07150fdbaad$export$9727364c1216843b(iv)
        }, secret, $0896b07150fdbaad$export$9727364c1216843b(encryptedPayload));
        const decoded = new TextDecoder().decode(payloadBuffer);
        const decrypted = JSON.parse(decoded);
        return decrypted?.m ?? decrypted;
    } catch (e) {
        throw new Error("Failed to decrypt " + e?.message);
    }
}


class $915d3af34ac4ebe9$export$8688904fb0eaa63d {
    debugData() {
        return Object.fromEntries(this.data.entries());
    }
    async loadIdentityBackup(backup) {
        this.setItem(`identity:${backup.thumbprint}`, backup.identity);
        Object.entries(backup.invites ?? {}).forEach(([key, value])=>{
            this.appendItem(`invitations:${backup.thumbprint}`, key, {
                unique: true
            });
            this.setItem(`invitation:${key}`, value);
        });
        Object.entries(backup.encryptedThreadKeys).forEach(([thumbprint, key])=>{
            this.setItem(`encrypted-thread-key:${thumbprint}`, key);
        });
        Object.entries(backup.threads).forEach(([id, thread])=>{
            const threadId = id;
            this.appendItem(`threads:${backup.thumbprint}`, threadId);
            this.setItem(`thread-info:${backup.thumbprint}:${threadId}`, thread.threadInfo);
            this.setItem(`keyed-messages:${backup.thumbprint}:${threadId}`, thread.messages);
        });
    }
    async makeIdentityBackup(thumbprint, idPrivateKey, storagePrivateKey) {
        const identity = this.getItem(`identity:${thumbprint}`);
        const encryptedThreadKeys = {};
        return {
            thumbprint: thumbprint,
            identity: {
                id: {
                    jwk: identity.id.jwk,
                    private: idPrivateKey
                },
                storage: {
                    jwk: identity.storage.jwk,
                    private: storagePrivateKey
                }
            },
            invites: this.queryItem(`invitations:${thumbprint}`)?.reduce((memo, key)=>{
                memo[key] = this.getItem(`invitation:${key}`);
                encryptedThreadKeys[key] = this.getItem(`encrypted-thread-key:${key}`);
                return memo;
            }, {}),
            threads: await this.queryItem(`threads:${thumbprint}`)?.reduce(async (m, key)=>{
                const memo = await m;
                const threadInfo = this.getItem(`thread-info:${thumbprint}:${key}`);
                const messages = this.getItem(`keyed-messages:${thumbprint}:${key}`);
                encryptedThreadKeys[threadInfo.myThumbprint] = this.getItem(`encrypted-thread-key:${threadInfo.myThumbprint}`);
                memo[key] = {
                    threadInfo: threadInfo,
                    messages: messages
                };
                return memo;
            }, Promise.resolve({})) ?? {},
            encryptedThreadKeys: encryptedThreadKeys
        };
    }
    storeMessage(thumbprint, threadId, messageId, message) {
        const index = this.queryItem(`keyed-messages:${thumbprint}:${threadId}`) ?? {
            min: messageId,
            max: messageId,
            messages: []
        };
        index.messages.push(message);
        this.setItem(`keyed-messages:${thumbprint}:${threadId}`, index);
    }
    readMessages(thumbprint, threadId) {
        const { messages: messages } = this.getItem(`keyed-messages:${thumbprint}:${threadId}`);
        return messages;
    }
    constructor(){
        this.data = new Map();
        this.hasItem = (key)=>{
            return this.data.has(key);
        };
        this.removeItem = (key)=>{
            this.data.delete(key);
            return null;
        };
        this.queryItem = (key)=>{
            return this.data.get(key);
        };
        this.getItem = (key)=>{
            (0, $0896b07150fdbaad$export$f5708dca728d7177)(this.hasItem(key), `Key ${key} not found in storage.`);
            return this.data.get(key);
        };
        this.setItem = (key, value)=>{
            this.data.set(key, value);
        };
        this.appendItem = (key, value, { unique: unique = false } = {})=>{
            let arr = this.queryItem(key);
            if (!Array.isArray(arr)) arr = [];
            if (unique && arr.includes(value)) return;
            arr.push(value);
            this.setItem(key, arr);
        };
    }
}





function $28329a9291b207ed$export$56a086ad643c12e4(id, state) {
    if ("syn" in id) {
        if (state.syn === undefined) state.syn = id.syn;
        else if (id.syn === (0, $2a29acee125cb879$export$af15847d6300ede1)(state.syn)) state.syn = id.syn;
        else throw new Error(`Syn out of order ${id.syn} - Expected: ${(0, $2a29acee125cb879$export$af15847d6300ede1)(state.syn)}`);
    } else {
        if (!state.minAck || !state.maxAck) {
            // initialize
            state.minAck = id.ack;
            state.maxAck = id.ack;
        } else if (id.ack === (0, $2a29acee125cb879$export$af15847d6300ede1)(state.maxAck)) {
            // Next expected message (max)
            state.maxAck = id.ack;
            if (id.ack === (0, $2a29acee125cb879$export$af15847d6300ede1)(state.minAck)) // min/ax are in sync --- This is the ideal scenario
            state.minAck = id.ack;
        } else if (id.ack === (0, $2a29acee125cb879$export$af15847d6300ede1)(state.minAck)) // Increment the minAck
        state.minAck = id.ack;
        else if (id.ack <= state.minAck || id.ack === state.maxAck) // Ignore duplicate
        return false;
        else if (id.ack > state.maxAck) {
            const min = parseInt(state.minAck, 16);
            const ack = parseInt(id.ack, 16);
            if (ack - min >= state.windowSize) throw new Error(`Missing ${ack - min} messages between ${state.minAck} and ${id.ack}`);
            if (state.missing.length === 0) for(let i = min + 1; i < ack; i++)state.missing.push(i.toString(16));
            const i = state.missing.findIndex((m)=>m === id.ack);
            if (i !== -1) state.missing.splice(i, 1);
            state.maxAck = id.ack;
        } else throw new Error(`Ack out of order ${JSON.stringify(id)} ${JSON.stringify(state)}`);
    }
    return true;
}



var $2a29acee125cb879$require$Buffer = $hxj1O$Buffer;
const $2a29acee125cb879$var$keyNicknames = new Map();
function $2a29acee125cb879$export$89cea9803cad95d2(key, nickname) {
    $2a29acee125cb879$var$keyNicknames.set(key, nickname);
}
function $2a29acee125cb879$export$1a98f7a90e54a705(key) {
    return $2a29acee125cb879$var$keyNicknames.get(key) + "_" + key.substring(key.length - 6);
}
let $2a29acee125cb879$var$messageIdForInviteTesting;
function $2a29acee125cb879$export$93d3c069f88f1516(messageId) {
    $2a29acee125cb879$var$messageIdForInviteTesting = messageId;
}
const $2a29acee125cb879$var$MAX_MESSAGE_ID = Number.MAX_SAFE_INTEGER / 2;
class $2a29acee125cb879$export$1f2bb630327ac4b6 {
    async setClientNickname(nickname) {
        this.clientNickname = nickname;
        if (nickname) {
            $2a29acee125cb879$export$89cea9803cad95d2(this.thumbprint, this.clientNickname);
            $2a29acee125cb879$export$89cea9803cad95d2(await (0, $0896b07150fdbaad$export$d223eef5bee92cf8)(await (0, $0896b07150fdbaad$export$96341dfa0e2e9076)(this.storageKeyPair.publicKey)), `storage[${this.clientNickname}]`);
        }
    }
    constructor(storage, thumbprint, identityKeyPair, storageKeyPair){
        this.storage = storage;
        this.thumbprint = thumbprint;
        this.identityKeyPair = identityKeyPair;
        this.storageKeyPair = storageKeyPair;
        this.isLocalClient = true;
        this.isLoggedIn = true;
        this.clientNickname = Math.random().toString(36).slice(2);
        this.subscriptions = new Set();
    }
    async getThumbprint() {
        return this.thumbprint;
    }
    static async generateClient(storage, password) {
        const identity = await (0, $0896b07150fdbaad$export$30269e8f0eedc10a)();
        const storageKey = await (0, $0896b07150fdbaad$export$b1dda1088d254686)();
        const idJWKs = await (0, $0896b07150fdbaad$export$87d43765c0bdfdff)(identity);
        const storageJWKs = await (0, $0896b07150fdbaad$export$87d43765c0bdfdff)(storageKey);
        const encryptedIdentity = await (0, $0896b07150fdbaad$export$4f5b87a5ef040005)(idJWKs.privateKeyJWK, password);
        const encryptedStorageKey = await (0, $0896b07150fdbaad$export$4f5b87a5ef040005)(storageJWKs.privateKeyJWK, password);
        const thumbprint = await (0, $0896b07150fdbaad$export$d223eef5bee92cf8)(idJWKs.publicKeyJWK);
        storage.setItem(`identity:${thumbprint}`, {
            id: {
                jwk: idJWKs.publicKeyJWK,
                private: encryptedIdentity
            },
            storage: {
                jwk: storageJWKs.publicKeyJWK,
                private: encryptedStorageKey
            }
        });
        return $2a29acee125cb879$export$1f2bb630327ac4b6.loadClient(storage, thumbprint, password);
    }
    static async loadFromBackup(storage, backup, password) {
        if (typeof backup === "string") {
            const jws = await (0, $0896b07150fdbaad$export$99859bc1ea511bf9)(backup);
            return $2a29acee125cb879$export$1f2bb630327ac4b6.loadFromBackup(storage, jws.payload, password);
        }
        const identityPrivateKey = await (0, $0896b07150fdbaad$export$c97f585acdba2853)(backup.identity.id.private, password);
        const storagePrivateKey = await (0, $0896b07150fdbaad$export$c97f585acdba2853)(backup.identity.storage.private, password);
        const identityKeyPair = await (0, $0896b07150fdbaad$export$57926b65d55505fc)({
            privateKeyJWK: identityPrivateKey,
            publicKeyJWK: backup.identity.id.jwk
        }, "ecdsa");
        const storageKeyPair = await (0, $0896b07150fdbaad$export$57926b65d55505fc)({
            privateKeyJWK: storagePrivateKey,
            publicKeyJWK: backup.identity.storage.jwk
        }, "ecdh");
        await storage.loadIdentityBackup(backup);
        const client = new $2a29acee125cb879$export$1f2bb630327ac4b6(storage, backup.thumbprint, identityKeyPair, storageKeyPair);
        return client;
    }
    static async loadClient(storage, thumbprint, password) {
        const storedData = storage.getItem(`identity:${thumbprint}`);
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(storedData, "No identity found for thumbprint");
        const privateKeyJWK = await (0, $0896b07150fdbaad$export$c97f585acdba2853)(storedData.id.private, password);
        const id = await (0, $0896b07150fdbaad$export$57926b65d55505fc)({
            privateKeyJWK: privateKeyJWK,
            publicKeyJWK: storedData.id.jwk
        }, "ecdsa");
        const storageKeys = await (0, $0896b07150fdbaad$export$57926b65d55505fc)({
            privateKeyJWK: await (0, $0896b07150fdbaad$export$c97f585acdba2853)(storedData.storage.private, password),
            publicKeyJWK: storedData.storage.jwk
        }, "ecdh");
        return new $2a29acee125cb879$export$1f2bb630327ac4b6(storage, thumbprint, id, storageKeys);
    }
    async decryptFromSelf(message) {
        const selfEncrypted = await (0, $0896b07150fdbaad$export$99859bc1ea511bf9)(message, this.identityKeyPair.publicKey);
        const epk = await (0, $0896b07150fdbaad$export$f7283e97187223bd)("ECDH", selfEncrypted.header.epk);
        const secret = await (0, $0896b07150fdbaad$export$d8c619be39dc35fe)(this.storageKeyPair.privateKey, epk);
        const payload = await (0, $0896b07150fdbaad$export$989b3bbdce9ac2d4)(secret, selfEncrypted.header.iv, selfEncrypted.payload);
        return payload;
    }
    async encryptToSelf(message) {
        const epk = await (0, $0896b07150fdbaad$export$b1dda1088d254686)();
        const jwks = await (0, $0896b07150fdbaad$export$87d43765c0bdfdff)(epk);
        const secret = await (0, $0896b07150fdbaad$export$d8c619be39dc35fe)(epk.privateKey, this.storageKeyPair.publicKey);
        const { iv: iv, encrypted: encrypted } = await (0, $0896b07150fdbaad$export$cfb0e8a6f536315e)(secret, message);
        const selfEncrypted = {
            header: {
                alg: "ES384",
                jwk: (await (0, $0896b07150fdbaad$export$87d43765c0bdfdff)(this.identityKeyPair)).publicKeyJWK,
                iat: 0,
                sub: "self-encrypted",
                iv: iv,
                epk: jwks.publicKeyJWK
            },
            payload: encrypted
        };
        const encryptedJWS = await (0, $0896b07150fdbaad$export$d71a6df60c6808b)(selfEncrypted.header, selfEncrypted.payload, this.identityKeyPair.privateKey);
        // try {
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(await (0, $0896b07150fdbaad$export$bcc5355044a25ec)(encryptedJWS), "Error encrypting message");
        const decryptedMessage = await this.decryptFromSelf(encryptedJWS);
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(decryptedMessage, "Decrypted message is empty");
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(decryptedMessage === message || message === JSON.stringify(decryptedMessage), "Decrypted message mismatch");
        // } catch (e: any) {
        //   throw new Error(`Error encrypting message: ${e?.message ?? e}`);
        // }
        return encryptedJWS;
    }
    async createInvitation({ note: note, nickname: nickname }) {
        const { thumbprint: thumbprint, jwks: jwks } = await this.makeThreadKeys();
        const invitation = {
            header: {
                alg: "ES384",
                jwk: (await (0, $0896b07150fdbaad$export$87d43765c0bdfdff)(this.identityKeyPair)).publicKeyJWK,
                iat: 0,
                sub: "grid-invitation"
            },
            payload: {
                messageId: Number($2a29acee125cb879$var$messageIdForInviteTesting ?? Math.floor(Math.random() * $2a29acee125cb879$var$MAX_MESSAGE_ID)).toString(16),
                epk: jwks.publicKeyJWK,
                note: note,
                nickname: nickname
            }
        };
        const signedInvitation = await (0, $0896b07150fdbaad$export$d71a6df60c6808b)(invitation.header, invitation.payload, this.identityKeyPair.privateKey);
        this.storage.setItem(`invitation:${thumbprint}`, signedInvitation);
        this.storage.appendItem(`invitations:${this.thumbprint}`, thumbprint, {
            unique: true
        });
        this.storage.setItem(`threads:${this.thumbprint}`, this.storage.queryItem(`threads:${this.thumbprint}`) ?? []);
        this.notifySubscribers();
        return signedInvitation;
    }
    async replyToInvitation(signedInvite, message, nickname, { setMyRelay: setMyRelay } = {}) {
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(await (0, $0896b07150fdbaad$export$bcc5355044a25ec)(signedInvite), "Invalid invitation signature");
        const invite = await (0, $0896b07150fdbaad$export$99859bc1ea511bf9)(signedInvite);
        const threadId = await this.startThread(signedInvite, invite.payload.epk, invite.header.jwk);
        const reply = this.replyToThread(threadId, message, {
            selfSign: true,
            nickname: nickname,
            setMyRelay: setMyRelay
        });
        return reply;
    }
    async startThread(signedInvite, theirEPKJWK, theirSignature, myThumbprint) {
        if (!myThumbprint) {
            const { thumbprint: thumbprint } = await this.makeThreadKeys();
            myThumbprint = thumbprint;
        }
        const keyBackup = this.storage.getItem(`encrypted-thread-key:${myThumbprint}`);
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(keyBackup, `Thread key not found ${myThumbprint}`);
        const signatureThumbprint = await (0, $0896b07150fdbaad$export$d223eef5bee92cf8)(theirSignature);
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(!myThumbprint || signatureThumbprint !== this.thumbprint, "Cannot start a thread with yourself");
        const thumbprints = [
            await (0, $0896b07150fdbaad$export$d223eef5bee92cf8)(theirEPKJWK),
            myThumbprint
        ].sort();
        const threadId = (0, $hxj1O$ArrayBuffertohex)(await window.crypto.subtle.digest("SHA-256", $2a29acee125cb879$require$Buffer.from(thumbprints.join(":"))));
        if (this.storage.queryItem(`thread-info:${this.thumbprint}:${threadId}`)) return threadId;
        this.storage.setItem(`thread-info:${this.thumbprint}:${threadId}`, {
            missing: [],
            windowSize: 5,
            maxAck: undefined,
            minAck: undefined,
            syn: undefined,
            myThumbprint: myThumbprint,
            theirEPK: theirEPKJWK,
            signedInvite: signedInvite,
            theirSignature: theirSignature,
            relays: {}
        });
        this.storage.appendItem(`threads:${this.thumbprint}`, threadId);
        await this.appendThread(signedInvite, threadId);
        this.notifySubscribers();
        return threadId;
    }
    async getThreads() {
        return this.storage.queryItem(`threads:${this.thumbprint}`) ?? [];
    }
    async getInvitationIds() {
        return this.storage.queryItem(`invitations:${this.thumbprint}`) ?? [];
    }
    async getInvitations() {
        return (await this.getInvitationIds()).map((t)=>this.storage.getItem(`invitation:${t}`));
    }
    async getInvitation(thumbprint) {
        return this.storage.getItem(`invitation:${thumbprint}`);
    }
    async makeThreadKeys() {
        const threadKey = await (0, $0896b07150fdbaad$export$b1dda1088d254686)();
        const jwks = await (0, $0896b07150fdbaad$export$87d43765c0bdfdff)(threadKey);
        const thumbprint = await (0, $0896b07150fdbaad$export$d223eef5bee92cf8)(jwks.publicKeyJWK);
        $2a29acee125cb879$export$89cea9803cad95d2(thumbprint, `thread[${this.clientNickname}]`);
        const keyBackup = await this.encryptToSelf(JSON.stringify(jwks));
        this.storage.setItem(`encrypted-thread-key:${thumbprint}`, keyBackup);
        return {
            thumbprint: thumbprint,
            jwks: jwks
        };
    }
    async readThreadSecret(threadThumbprint) {
        const threadInfo = this.storage.getItem(`thread-info:${this.thumbprint}:${threadThumbprint}`);
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(threadInfo, "Thread not found");
        const publicJWK = threadInfo.theirEPK;
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(publicJWK, `Public key not found ${threadInfo.theirEPK}`);
        const encryptedBackup = this.storage.getItem(`encrypted-thread-key:${threadInfo.myThumbprint}`);
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(typeof encryptedBackup === "string", `Thread key not found ${threadInfo.myThumbprint}`);
        const jwks = JSON.parse(await this.decryptFromSelf(encryptedBackup));
        const pKey = await (0, $0896b07150fdbaad$export$f7283e97187223bd)("ECDH", publicJWK);
        const privateKey = await (0, $0896b07150fdbaad$export$a130e185e3431961)("ECDH", jwks.privateKeyJWK);
        return {
            secret: await (0, $0896b07150fdbaad$export$d8c619be39dc35fe)(privateKey, pKey),
            epk: jwks.publicKeyJWK
        };
    }
    async replyToThread(threadId, message, options) {
        const { secret: secret, epk: epk } = await this.readThreadSecret(threadId);
        const threadInfo = this.storage.getItem(`thread-info:${this.thumbprint}:${threadId}`);
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(threadInfo, "Thread not found");
        const messageId = threadInfo.syn ?? Number($2a29acee125cb879$var$messageIdForInviteTesting ? parseInt("100000", 16) + $2a29acee125cb879$var$messageIdForInviteTesting : Math.floor(Math.random() * $2a29acee125cb879$var$MAX_MESSAGE_ID)).toString(16);
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(typeof messageId === "string", `Invalid message id ${messageId}`);
        const nextId = $2a29acee125cb879$export$af15847d6300ede1(messageId);
        if (options?.setMyRelay) threadInfo.relays[this.thumbprint] = options.setMyRelay;
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(threadInfo.minAck, `Missing minAck in "thread-info" ${message}`);
        let replyMessage = {
            header: {
                iat: 0,
                alg: "ES384",
                sub: "grid-reply",
                re: threadId,
                iv: "",
                from: this.thumbprint
            },
            payload: {
                messageId: nextId,
                message: message,
                minAck: threadInfo.minAck,
                relay: options?.setMyRelay
            }
        };
        // threadInfo.syn = nextId;
        this.storage.setItem(`thread-info:${this.thumbprint}:${threadId}`, threadInfo);
        if (options?.selfSign && options.nickname) {
            const ack = {
                header: {
                    ...replyMessage.header,
                    sub: "reply-to-invite",
                    jwk: await (0, $0896b07150fdbaad$export$96341dfa0e2e9076)(this.identityKeyPair.publicKey),
                    invite: await (0, $0896b07150fdbaad$export$d223eef5bee92cf8)(threadInfo.theirEPK),
                    epk: epk
                },
                payload: {
                    ...replyMessage.payload,
                    nickname: options.nickname,
                    messageId: Number($2a29acee125cb879$var$messageIdForInviteTesting ? parseInt("100000", 16) + $2a29acee125cb879$var$messageIdForInviteTesting : Math.floor(Math.random() * $2a29acee125cb879$var$MAX_MESSAGE_ID)).toString(16)
                }
            };
            replyMessage = ack;
        }
        const { iv: iv, encrypted: encrypted } = await (0, $0896b07150fdbaad$export$cfb0e8a6f536315e)(secret, replyMessage.payload);
        replyMessage.header.iv = iv;
        const encryptedJWS = await (0, $0896b07150fdbaad$export$d71a6df60c6808b)(replyMessage.header, encrypted, this.identityKeyPair.privateKey);
        (0, $0896b07150fdbaad$export$f5708dca728d7177)((0, $0896b07150fdbaad$export$bcc5355044a25ec)(encryptedJWS, this.identityKeyPair.publicKey), "Error encrypting message");
        const theirThumbprint = await (0, $0896b07150fdbaad$export$d223eef5bee92cf8)(threadInfo.theirSignature);
        const relay = threadInfo.relays[theirThumbprint];
        await this.appendThread(encryptedJWS, threadId);
        return {
            reply: encryptedJWS,
            threadId: threadId,
            relay: relay
        };
    }
    async appendThread(encryptedMessage, threadId) {
        const jws = (0, $0896b07150fdbaad$export$56ce858a5181ed60)(encryptedMessage);
        if (!threadId) switch(jws.header.sub){
            case "grid-invitation":
                // const invite = jws as Invitation;
                throw new Error("Not Implemented");
            case "reply-to-invite":
                {
                    const isValid = (0, $0896b07150fdbaad$export$bcc5355044a25ec)(encryptedMessage);
                    (0, $0896b07150fdbaad$export$f5708dca728d7177)(isValid, "Expected a self-signed message");
                    const reply = jws;
                    (0, $0896b07150fdbaad$export$f5708dca728d7177)(reply.header.epk, "First message must have an epk");
                    (0, $0896b07150fdbaad$export$f5708dca728d7177)(reply.header.invite, 'First message must have an "invite" header');
                    const invitationThumbprint = reply.header.invite;
                    const invitation = this.storage.getItem(`invitation:${invitationThumbprint}`);
                    (0, $0896b07150fdbaad$export$f5708dca728d7177)(invitation, "Invitation not found " + invitationThumbprint);
                    const invitationJWS = await (0, $0896b07150fdbaad$export$99859bc1ea511bf9)(invitation);
                    const myThumbprint = await (0, $0896b07150fdbaad$export$d223eef5bee92cf8)(invitationJWS.payload.epk);
                    threadId = await this.startThread(invitation, reply.header.epk, reply.header.jwk, myThumbprint);
                // FALLS THROUGH
                }
            case "grid-reply":
                {
                    const reply = jws;
                    threadId ??= reply.header.re;
                    const threadInfo = this.storage.getItem(`thread-info:${this.thumbprint}:${threadId}`);
                    const fromMe = reply.header.from === this.thumbprint;
                    let isValid = false;
                    if (fromMe) isValid = await (0, $0896b07150fdbaad$export$bcc5355044a25ec)(encryptedMessage, this.identityKeyPair.publicKey);
                    else isValid = await (0, $0896b07150fdbaad$export$bcc5355044a25ec)(encryptedMessage, threadInfo.theirSignature);
                    (0, $0896b07150fdbaad$export$f5708dca728d7177)(isValid, "Invalid message signature");
                    return this.appendThread(encryptedMessage, threadId);
                }
        }
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(threadId, "Thread not found");
        const message = await this.decryptMessage(threadId, encryptedMessage);
        const threadInfo = {
            ...this.storage.getItem(`thread-info:${this.thumbprint}:${threadId}`)
        };
        const fromMe = message.fromThumbprint === this.thumbprint;
        let isValid;
        if (fromMe) isValid = await (0, $0896b07150fdbaad$export$bcc5355044a25ec)(encryptedMessage, this.identityKeyPair.publicKey);
        else isValid = await (0, $0896b07150fdbaad$export$bcc5355044a25ec)(encryptedMessage, threadInfo.theirSignature);
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(isValid, "Invalid message signature");
        const storeMessage = (0, $28329a9291b207ed$export$56a086ad643c12e4)(fromMe ? {
            syn: message.messageId
        } : {
            ack: message.messageId
        }, threadInfo);
        if (storeMessage) {
            const m = this.storage.queryItem(`keyed-messages:${this.thumbprint}:${threadId}`)?.messages;
            (0, $0896b07150fdbaad$export$f5708dca728d7177)(m ? !m.includes(encryptedMessage) : true, // m?.[0] !== encryptedMessage || lastMessage !== encryptedMessage,
            `Message already exists in thread ${JSON.stringify({
                nickname: this.clientNickname,
                messageId: message.messageId,
                sub: jws.header.sub,
                threadId: threadId,
                messageIndex: m?.indexOf(encryptedMessage)
            }, null, 2)}`);
            if (message.relay) {
                threadInfo.relays[await (0, $0896b07150fdbaad$export$d223eef5bee92cf8)(threadInfo.theirSignature)] = message.relay;
                if (message.relay && message.relay.match(/^https?:\/\/ntfy.sh\/[^.]+$/)) threadInfo.relays[this.thumbprint] = message.relay;
            }
            this.storage.setItem(`thread-info:${this.thumbprint}:${threadId}`, threadInfo);
            this.storage.storeMessage(this.thumbprint, threadId, message.messageId, encryptedMessage);
            this.notifySubscribers();
        } else console.warn("Skipping message", message.messageId);
        return {
            threadId: threadId,
            message: message,
            relay: message.relay
        };
    }
    async decryptThread(threadId) {
        const thread = await this.getEncryptedThread(threadId);
        const messages = await Promise.all(thread.map(async (message)=>{
            return typeof message === "string" ? this.decryptMessage(threadId, message) : message;
        }));
        messages.sort((a, b)=>{
            if (a.from !== b.from) {
                if (a.minAck && a.minAck < b.messageId) return 1;
                if (b.minAck && b.minAck < a.messageId) return 1;
            }
            const order = (a.type === "invite" ? -1 : 0) || (b.type === "invite" ? 1 : 0) || b.iat - a.iat || (a.from === b.from ? a.messageId.localeCompare(b.messageId) : 0);
            return order;
        });
        return messages;
    }
    async decryptMessage(threadId, encryptedMessage) {
        const threadInfo = this.storage.getItem(`thread-info:${this.thumbprint}:${threadId}`);
        const jws = await (0, $0896b07150fdbaad$export$99859bc1ea511bf9)(encryptedMessage, null);
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(threadInfo, "Thread not found");
        if (jws.header.sub === "grid-invitation") {
            // Looks like an Invite
            (0, $0896b07150fdbaad$export$f5708dca728d7177)(await (0, $0896b07150fdbaad$export$bcc5355044a25ec)(encryptedMessage), "Invalid message signature");
            const jwsInvite = jws;
            const message = `Invite from ${jwsInvite.payload.nickname}.\nNote: ${jwsInvite.payload.note ?? "(none)"}`;
            const from = await (0, $0896b07150fdbaad$export$d223eef5bee92cf8)(jwsInvite.header.jwk);
            if (jwsInvite.payload.nickname) $2a29acee125cb879$export$89cea9803cad95d2(from, jwsInvite.payload.nickname);
            return {
                from: $2a29acee125cb879$export$1a98f7a90e54a705(from),
                fromThumbprint: from,
                epkThumbprint: await (0, $0896b07150fdbaad$export$d223eef5bee92cf8)(jwsInvite.payload.epk),
                message: message,
                type: "invite",
                iat: jwsInvite.header.iat,
                messageId: jwsInvite.payload.messageId,
                minAck: undefined
            };
        }
        const reply = jws;
        const { secret: secret } = await this.readThreadSecret(threadId);
        const payload = await (0, $0896b07150fdbaad$export$989b3bbdce9ac2d4)(secret, jws.header.iv, reply.payload);
        const from = reply.header.from;
        const theirThumbprint = await (0, $0896b07150fdbaad$export$d223eef5bee92cf8)(threadInfo.theirSignature);
        const epkThumbprint = from === theirThumbprint ? await (0, $0896b07150fdbaad$export$d223eef5bee92cf8)(threadInfo.theirEPK) : threadInfo.myThumbprint;
        return {
            from: $2a29acee125cb879$export$1a98f7a90e54a705(from),
            fromThumbprint: from,
            epkThumbprint: epkThumbprint,
            message: payload.message,
            type: "message",
            iat: reply.header.iat,
            messageId: payload.messageId,
            minAck: payload.minAck,
            relay: payload.relay
        };
    }
    async getEncryptedThread(threadId) {
        return this.storage.readMessages(this.thumbprint, threadId);
    }
    async getThreadInfo(thread) {
        const threadInfo = this.storage.getItem(`thread-info:${this.thumbprint}:${thread}`);
        (0, $0896b07150fdbaad$export$f5708dca728d7177)(threadInfo, "Thread not found");
        const myRelay = threadInfo.relays[this.thumbprint];
        return {
            myRelay: myRelay,
            myNickname: $2a29acee125cb879$export$1a98f7a90e54a705(this.thumbprint),
            theirNickname: $2a29acee125cb879$export$1a98f7a90e54a705(await (0, $0896b07150fdbaad$export$d223eef5bee92cf8)(threadInfo.theirSignature))
        };
    }
    async makeBackup(password) {
        const idJWKs = await (0, $0896b07150fdbaad$export$87d43765c0bdfdff)(this.identityKeyPair);
        const storageJWKs = await (0, $0896b07150fdbaad$export$87d43765c0bdfdff)(this.storageKeyPair);
        const encryptedIdentity = await (0, $0896b07150fdbaad$export$4f5b87a5ef040005)(idJWKs.privateKeyJWK, password);
        const encryptedStorageKey = await (0, $0896b07150fdbaad$export$4f5b87a5ef040005)(storageJWKs.privateKeyJWK, password);
        const payload = await this.storage.makeIdentityBackup(this.thumbprint, encryptedIdentity, encryptedStorageKey);
        return (0, $0896b07150fdbaad$export$d71a6df60c6808b)({
            alg: "ES384",
            jwk: idJWKs.publicKeyJWK
        }, payload, this.identityKeyPair.privateKey);
    }
    notifySubscribers() {
        for (const sub of this.subscriptions)try {
            sub?.();
        } catch (e) {
        // Ignore
        }
    }
    subscribe(onChange) {
        this.subscriptions ??= new Set();
        this.subscriptions.add(onChange);
        return ()=>{
            this.subscriptions.delete(onChange);
        };
    }
}
function $2a29acee125cb879$export$af15847d6300ede1(messageId) {
    let nextId = parseInt(messageId, 16) + 1;
    if (nextId >= $2a29acee125cb879$var$MAX_MESSAGE_ID) nextId = 1;
    (0, $0896b07150fdbaad$export$f5708dca728d7177)(!Number.isNaN(nextId), `Invalid message id ${messageId} ${nextId}`);
    const n = nextId.toString(16);
    (0, $0896b07150fdbaad$export$f5708dca728d7177)(!Number.isNaN(n), `Invalid message toString ${messageId} ${nextId}`);
    return n;
}


export {$2a29acee125cb879$export$89cea9803cad95d2 as setNickname, $2a29acee125cb879$export$1a98f7a90e54a705 as getNickname, $2a29acee125cb879$export$93d3c069f88f1516 as setMessageIdForTesting, $2a29acee125cb879$export$1f2bb630327ac4b6 as Client, $2a29acee125cb879$export$af15847d6300ede1 as incMessageId, $915d3af34ac4ebe9$export$8688904fb0eaa63d as GridStorage};
//# sourceMappingURL=module.js.map
