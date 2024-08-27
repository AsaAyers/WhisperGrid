"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GridStorage = exports.Client = void 0;
exports.setNickname = setNickname;
exports.getNickname = getNickname;
exports.setMessageIdForTesting = setMessageIdForTesting;
exports.incMessageId = incMessageId;
/* eslint-disable @typescript-eslint/no-explicit-any */
const GridStorage_1 = require("./GridStorage");
Object.defineProperty(exports, "GridStorage", { enumerable: true, get: function () { return GridStorage_1.GridStorage; } });
const utils_1 = require("./utils");
const jsrsasign_1 = require("jsrsasign");
const synAck_1 = require("./synAck");
const keyNicknames = new Map();
function setNickname(key, nickname) {
    keyNicknames.set(key, nickname);
}
function getNickname(key) {
    return keyNicknames.get(key) + "_" + key.substring(key.length - 6);
}
let messageIdForInviteTesting;
function setMessageIdForTesting(messageId) {
    messageIdForInviteTesting = messageId;
}
const MAX_MESSAGE_ID = Number.MAX_SAFE_INTEGER / 2;
/**
 * In order to use the client over a websocket connection, everything on it
 * should be async functions. They also can't be arrow functions, because the
 * proxy is looking at the prototype to figure out if there is a function to
 * call.
 */
class Client {
    storage;
    thumbprint;
    identityKeyPair;
    storageKeyPair;
    isLocalClient = true; // The proxy will override this
    /**
     * The proxy uses this to distinguish between a complete Client object and a
     * RemoteSetup object.
     */
    isLoggedIn = true;
    clientNickname = Math.random().toString(36).slice(2);
    async setClientNickname(nickname) {
        this.clientNickname = nickname;
        if (nickname) {
            setNickname(this.thumbprint, this.clientNickname);
            setNickname(await (0, utils_1.getJWKthumbprint)(await (0, utils_1.exportKey)(this.storageKeyPair.publicKey)), `storage[${this.clientNickname}]`);
        }
    }
    constructor(storage, thumbprint, identityKeyPair, storageKeyPair) {
        this.storage = storage;
        this.thumbprint = thumbprint;
        this.identityKeyPair = identityKeyPair;
        this.storageKeyPair = storageKeyPair;
    }
    async getThumbprint() {
        return this.thumbprint;
    }
    static async generateClient(storage, password) {
        const identity = await (0, utils_1.generateECDSAKeyPair)();
        const storageKey = await (0, utils_1.generateECDHKeyPair)();
        const idJWKs = await (0, utils_1.exportKeyPair)(identity);
        const storageJWKs = await (0, utils_1.exportKeyPair)(storageKey);
        const encryptedIdentity = await (0, utils_1.encryptPrivateKey)(idJWKs.privateKeyJWK, password);
        const encryptedStorageKey = await (0, utils_1.encryptPrivateKey)(storageJWKs.privateKeyJWK, password);
        const thumbprint = await (0, utils_1.getJWKthumbprint)(idJWKs.publicKeyJWK);
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
    static async loadFromBackup(storage, backup, password) {
        if (typeof backup === "string") {
            const jws = await (0, utils_1.parseJWS)(backup);
            return Client.loadFromBackup(storage, jws.payload, password);
        }
        const identityPrivateKey = await (0, utils_1.decryptPrivateKey)(backup.identity.id.private, password);
        const storagePrivateKey = await (0, utils_1.decryptPrivateKey)(backup.identity.storage.private, password);
        const identityKeyPair = await (0, utils_1.importKeyPair)({
            privateKeyJWK: identityPrivateKey,
            publicKeyJWK: backup.identity.id.jwk,
        }, "ecdsa");
        const storageKeyPair = await (0, utils_1.importKeyPair)({
            privateKeyJWK: storagePrivateKey,
            publicKeyJWK: backup.identity.storage.jwk,
        }, "ecdh");
        await storage.loadIdentityBackup(backup);
        const client = new Client(storage, backup.thumbprint, identityKeyPair, storageKeyPair);
        return client;
    }
    static async loadClient(storage, thumbprint, password) {
        const storedData = storage.getItem(`identity:${thumbprint}`);
        (0, utils_1.invariant)(storedData, "No identity found for thumbprint");
        const privateKeyJWK = await (0, utils_1.decryptPrivateKey)(storedData.id.private, password);
        const id = await (0, utils_1.importKeyPair)({ privateKeyJWK, publicKeyJWK: storedData.id.jwk }, "ecdsa");
        const storageKeys = await (0, utils_1.importKeyPair)({
            privateKeyJWK: await (0, utils_1.decryptPrivateKey)(storedData.storage.private, password),
            publicKeyJWK: storedData.storage.jwk,
        }, "ecdh");
        return new Client(storage, thumbprint, id, storageKeys);
    }
    async decryptFromSelf(message) {
        const selfEncrypted = await (0, utils_1.parseJWS)(message, this.identityKeyPair.publicKey);
        const epk = await (0, utils_1.importPublicKey)("ECDH", selfEncrypted.header.epk);
        const secret = await (0, utils_1.deriveSharedSecret)(this.storageKeyPair.privateKey, epk);
        const payload = await (0, utils_1.decryptData)(secret, selfEncrypted.header.iv, selfEncrypted.payload);
        return payload;
    }
    async encryptToSelf(message) {
        const epk = await (0, utils_1.generateECDHKeyPair)();
        const jwks = await (0, utils_1.exportKeyPair)(epk);
        const secret = await (0, utils_1.deriveSharedSecret)(epk.privateKey, this.storageKeyPair.publicKey);
        const { iv, encrypted } = await (0, utils_1.encryptData)(secret, message);
        const selfEncrypted = {
            header: {
                alg: "ES384",
                jwk: (await (0, utils_1.exportKeyPair)(this.identityKeyPair)).publicKeyJWK,
                iat: 0,
                sub: "self-encrypted",
                iv,
                epk: jwks.publicKeyJWK,
            },
            payload: encrypted,
        };
        const encryptedJWS = (await (0, utils_1.signJWS)(selfEncrypted.header, selfEncrypted.payload, this.identityKeyPair.privateKey));
        // try {
        (0, utils_1.invariant)(await (0, utils_1.verifyJWS)(encryptedJWS), "Error encrypting message");
        const decryptedMessage = await this.decryptFromSelf(encryptedJWS);
        (0, utils_1.invariant)(decryptedMessage, "Decrypted message is empty");
        (0, utils_1.invariant)(decryptedMessage === message ||
            message === JSON.stringify(decryptedMessage), "Decrypted message mismatch");
        // } catch (e: any) {
        //   throw new Error(`Error encrypting message: ${e?.message ?? e}`);
        // }
        return encryptedJWS;
    }
    async createInvitation({ note, nickname, }) {
        const { thumbprint, jwks } = await this.makeThreadKeys();
        const invitation = {
            header: {
                alg: "ES384",
                jwk: (await (0, utils_1.exportKeyPair)(this.identityKeyPair)).publicKeyJWK,
                iat: 0,
                sub: "grid-invitation",
            },
            payload: {
                messageId: Number(messageIdForInviteTesting ??
                    Math.floor(Math.random() * MAX_MESSAGE_ID)).toString(16),
                epk: jwks.publicKeyJWK,
                note,
                nickname,
            },
        };
        const signedInvitation = (await (0, utils_1.signJWS)(invitation.header, invitation.payload, this.identityKeyPair.privateKey));
        this.storage.setItem(`invitation:${thumbprint}`, signedInvitation);
        this.storage.appendItem(`invitations:${this.thumbprint}`, thumbprint, {
            unique: true,
        });
        this.storage.setItem(`threads:${this.thumbprint}`, this.storage.queryItem(`threads:${this.thumbprint}`) ?? []);
        this.notifySubscribers();
        return signedInvitation;
    }
    async replyToInvitation(signedInvite, message, nickname, { setMyRelay } = {}) {
        (0, utils_1.invariant)(await (0, utils_1.verifyJWS)(signedInvite), "Invalid invitation signature");
        const invite = await (0, utils_1.parseJWS)(signedInvite);
        const threadId = await this.startThread(signedInvite, invite.payload.epk, invite.header.jwk);
        const reply = this.replyToThread(threadId, message, {
            selfSign: true,
            nickname,
            setMyRelay,
        });
        return reply;
    }
    async startThread(signedInvite, theirEPKJWK, theirSignature, myThumbprint) {
        if (!myThumbprint) {
            const { thumbprint } = await this.makeThreadKeys();
            myThumbprint = thumbprint;
        }
        const keyBackup = this.storage.getItem(`encrypted-thread-key:${myThumbprint}`);
        (0, utils_1.invariant)(keyBackup, `Thread key not found ${myThumbprint}`);
        const signatureThumbprint = await (0, utils_1.getJWKthumbprint)(theirSignature);
        (0, utils_1.invariant)(!myThumbprint || signatureThumbprint !== this.thumbprint, "Cannot start a thread with yourself");
        const thumbprints = [
            await (0, utils_1.getJWKthumbprint)(theirEPKJWK),
            myThumbprint,
        ].sort();
        const threadId = (0, jsrsasign_1.ArrayBuffertohex)(await window.crypto.subtle.digest("SHA-256", Buffer.from(thumbprints.join(":"))));
        if (this.storage.queryItem(`thread-info:${this.thumbprint}:${threadId}`)) {
            return threadId;
        }
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
    async getThreads() {
        return this.storage.queryItem(`threads:${this.thumbprint}`) ?? [];
    }
    async getInvitationIds() {
        return this.storage.queryItem(`invitations:${this.thumbprint}`) ?? [];
    }
    async getInvitations() {
        return (await this.getInvitationIds()).map((t) => this.storage.getItem(`invitation:${t}`));
    }
    async getInvitation(thumbprint) {
        return this.storage.getItem(`invitation:${thumbprint}`);
    }
    async makeThreadKeys() {
        const threadKey = await (0, utils_1.generateECDHKeyPair)();
        const jwks = await (0, utils_1.exportKeyPair)(threadKey);
        const thumbprint = await (0, utils_1.getJWKthumbprint)(jwks.publicKeyJWK);
        setNickname(thumbprint, `thread[${this.clientNickname}]`);
        const keyBackup = await this.encryptToSelf(JSON.stringify(jwks));
        this.storage.setItem(`encrypted-thread-key:${thumbprint}`, keyBackup);
        return { thumbprint, jwks };
    }
    async readThreadSecret(threadThumbprint) {
        const threadInfo = this.storage.getItem(`thread-info:${this.thumbprint}:${threadThumbprint}`);
        (0, utils_1.invariant)(threadInfo, "Thread not found");
        const publicJWK = threadInfo.theirEPK;
        (0, utils_1.invariant)(publicJWK, `Public key not found ${threadInfo.theirEPK}`);
        const encryptedBackup = this.storage.getItem(`encrypted-thread-key:${threadInfo.myThumbprint}`);
        (0, utils_1.invariant)(typeof encryptedBackup === "string", `Thread key not found ${threadInfo.myThumbprint}`);
        const jwks = JSON.parse(await this.decryptFromSelf(encryptedBackup));
        const pKey = await (0, utils_1.importPublicKey)("ECDH", publicJWK);
        const privateKey = await (0, utils_1.importPrivateKey)("ECDH", jwks.privateKeyJWK);
        return {
            secret: await (0, utils_1.deriveSharedSecret)(privateKey, pKey),
            epk: jwks.publicKeyJWK,
        };
    }
    async replyToThread(threadId, message, options) {
        const { secret, epk } = await this.readThreadSecret(threadId);
        const threadInfo = this.storage.getItem(`thread-info:${this.thumbprint}:${threadId}`);
        (0, utils_1.invariant)(threadInfo, "Thread not found");
        const messageId = threadInfo.syn ??
            Number(messageIdForInviteTesting
                ? parseInt("100000", 16) + messageIdForInviteTesting
                : Math.floor(Math.random() * MAX_MESSAGE_ID)).toString(16);
        (0, utils_1.invariant)(typeof messageId === "string", `Invalid message id ${messageId}`);
        const nextId = incMessageId(messageId);
        if (options?.setMyRelay) {
            threadInfo.relays[this.thumbprint] = options.setMyRelay;
        }
        (0, utils_1.invariant)(threadInfo.minAck, `Missing minAck in "thread-info" ${message}`);
        let replyMessage = {
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
                relay: options?.setMyRelay,
            },
        };
        // threadInfo.syn = nextId;
        this.storage.setItem(`thread-info:${this.thumbprint}:${threadId}`, threadInfo);
        if (options?.selfSign && options.nickname) {
            const ack = {
                header: {
                    ...replyMessage.header,
                    sub: "reply-to-invite",
                    jwk: await (0, utils_1.exportKey)(this.identityKeyPair.publicKey),
                    invite: await (0, utils_1.getJWKthumbprint)(threadInfo.theirEPK),
                    epk,
                },
                payload: {
                    ...replyMessage.payload,
                    nickname: options.nickname,
                    messageId: Number(messageIdForInviteTesting
                        ? parseInt("100000", 16) + messageIdForInviteTesting
                        : Math.floor(Math.random() * MAX_MESSAGE_ID)).toString(16),
                },
            };
            replyMessage = ack;
        }
        const { iv, encrypted } = await (0, utils_1.encryptData)(secret, replyMessage.payload);
        replyMessage.header.iv = iv;
        const encryptedJWS = (await (0, utils_1.signJWS)(replyMessage.header, encrypted, this.identityKeyPair.privateKey));
        (0, utils_1.invariant)((0, utils_1.verifyJWS)(encryptedJWS, this.identityKeyPair.publicKey), "Error encrypting message");
        const theirThumbprint = await (0, utils_1.getJWKthumbprint)(threadInfo.theirSignature);
        const relay = threadInfo.relays[theirThumbprint];
        await this.appendThread(encryptedJWS, threadId);
        return {
            reply: encryptedJWS,
            threadId,
            relay,
        };
    }
    async appendThread(encryptedMessage, threadId) {
        const jws = (0, utils_1.parseJWSSync)(encryptedMessage);
        if (!threadId) {
            switch (jws.header.sub) {
                case "grid-invitation": {
                    // const invite = jws as Invitation;
                    throw new Error("Not Implemented");
                    break;
                }
                case "reply-to-invite": {
                    const isValid = (0, utils_1.verifyJWS)(encryptedMessage);
                    (0, utils_1.invariant)(isValid, "Expected a self-signed message");
                    const reply = jws;
                    (0, utils_1.invariant)(reply.header.epk, "First message must have an epk");
                    (0, utils_1.invariant)(reply.header.invite, 'First message must have an "invite" header');
                    const invitationThumbprint = reply.header.invite;
                    const invitation = this.storage.getItem(`invitation:${invitationThumbprint}`);
                    (0, utils_1.invariant)(invitation, "Invitation not found " + invitationThumbprint);
                    const invitationJWS = await (0, utils_1.parseJWS)(invitation);
                    const myThumbprint = await (0, utils_1.getJWKthumbprint)(invitationJWS.payload.epk);
                    threadId = await this.startThread(invitation, reply.header.epk, reply.header.jwk, myThumbprint);
                    // FALLS THROUGH
                }
                case "grid-reply": {
                    const reply = jws;
                    threadId ??= reply.header.re;
                    const threadInfo = this.storage.getItem(`thread-info:${this.thumbprint}:${threadId}`);
                    const fromMe = reply.header.from === this.thumbprint;
                    let isValid = false;
                    if (fromMe) {
                        isValid = await (0, utils_1.verifyJWS)(encryptedMessage, this.identityKeyPair.publicKey);
                    }
                    else {
                        isValid = await (0, utils_1.verifyJWS)(encryptedMessage, threadInfo.theirSignature);
                    }
                    (0, utils_1.invariant)(isValid, "Invalid message signature");
                    return this.appendThread(encryptedMessage, threadId);
                }
            }
        }
        (0, utils_1.invariant)(threadId, "Thread not found");
        const message = await this.decryptMessage(threadId, encryptedMessage);
        const threadInfo = {
            ...this.storage.getItem(`thread-info:${this.thumbprint}:${threadId}`),
        };
        const fromMe = message.fromThumbprint === this.thumbprint;
        let isValid;
        if (fromMe) {
            isValid = await (0, utils_1.verifyJWS)(encryptedMessage, this.identityKeyPair.publicKey);
        }
        else {
            isValid = await (0, utils_1.verifyJWS)(encryptedMessage, threadInfo.theirSignature);
        }
        (0, utils_1.invariant)(isValid, "Invalid message signature");
        const storeMessage = (0, synAck_1.synAck)(fromMe
            ? {
                syn: message.messageId,
            }
            : {
                ack: message.messageId,
            }, threadInfo);
        if (storeMessage) {
            const m = this.storage.queryItem(`keyed-messages:${this.thumbprint}:${threadId}`)?.messages;
            (0, utils_1.invariant)(m ? !m.includes(encryptedMessage) : true, 
            // m?.[0] !== encryptedMessage || lastMessage !== encryptedMessage,
            `Message already exists in thread ${JSON.stringify({
                nickname: this.clientNickname,
                messageId: message.messageId,
                sub: jws.header.sub,
                threadId,
                messageIndex: m?.indexOf(encryptedMessage),
            }, null, 2)}`);
            if (message.relay) {
                threadInfo.relays[await (0, utils_1.getJWKthumbprint)(threadInfo.theirSignature)] =
                    message.relay;
                if (message.relay &&
                    message.relay.match(/^https?:\/\/ntfy.sh\/[^.]+$/)) {
                    threadInfo.relays[this.thumbprint] = message.relay;
                }
            }
            this.storage.setItem(`thread-info:${this.thumbprint}:${threadId}`, threadInfo);
            this.storage.storeMessage(this.thumbprint, threadId, message.messageId, encryptedMessage);
            this.notifySubscribers();
        }
        else {
            console.warn("Skipping message", message.messageId);
        }
        return {
            threadId: threadId,
            message,
            relay: message.relay,
        };
    }
    async decryptThread(threadId) {
        const thread = await this.getEncryptedThread(threadId);
        const messages = await Promise.all(thread.map(async (message) => {
            return typeof message === "string"
                ? this.decryptMessage(threadId, message)
                : message;
        }));
        messages.sort((a, b) => {
            if (a.from !== b.from) {
                if (a.minAck && a.minAck < b.messageId) {
                    return 1;
                }
                if (b.minAck && b.minAck < a.messageId) {
                    return 1;
                }
            }
            const order = (a.type === "invite" ? -1 : 0) ||
                (b.type === "invite" ? 1 : 0) ||
                b.iat - a.iat ||
                (a.from === b.from ? a.messageId.localeCompare(b.messageId) : 0);
            return order;
        });
        return messages;
    }
    async decryptMessage(threadId, encryptedMessage) {
        const threadInfo = this.storage.getItem(`thread-info:${this.thumbprint}:${threadId}`);
        const jws = await (0, utils_1.parseJWS)(encryptedMessage, null);
        (0, utils_1.invariant)(threadInfo, "Thread not found");
        if (jws.header.sub === "grid-invitation") {
            // Looks like an Invite
            (0, utils_1.invariant)(await (0, utils_1.verifyJWS)(encryptedMessage), "Invalid message signature");
            const jwsInvite = jws;
            const message = `Invite from ${jwsInvite.payload.nickname}.\nNote: ${jwsInvite.payload.note ?? "(none)"}`;
            const from = await (0, utils_1.getJWKthumbprint)(jwsInvite.header.jwk);
            if (jwsInvite.payload.nickname) {
                setNickname(from, jwsInvite.payload.nickname);
            }
            return {
                from: getNickname(from),
                fromThumbprint: from,
                epkThumbprint: await (0, utils_1.getJWKthumbprint)(jwsInvite.payload.epk),
                message,
                type: "invite",
                iat: jwsInvite.header.iat,
                messageId: jwsInvite.payload.messageId,
                minAck: undefined,
            };
        }
        const reply = jws;
        const { secret } = await this.readThreadSecret(threadId);
        const payload = await (0, utils_1.decryptData)(secret, jws.header.iv, reply.payload);
        const from = reply.header.from;
        const theirThumbprint = await (0, utils_1.getJWKthumbprint)(threadInfo.theirSignature);
        const epkThumbprint = from === theirThumbprint
            ? await (0, utils_1.getJWKthumbprint)(threadInfo.theirEPK)
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
    async getEncryptedThread(threadId) {
        return this.storage.readMessages(this.thumbprint, threadId);
    }
    async getThreadInfo(thread) {
        const threadInfo = this.storage.getItem(`thread-info:${this.thumbprint}:${thread}`);
        (0, utils_1.invariant)(threadInfo, "Thread not found");
        const myRelay = threadInfo.relays[this.thumbprint];
        return {
            myRelay,
            myNickname: getNickname(this.thumbprint),
            theirNickname: getNickname(await (0, utils_1.getJWKthumbprint)(threadInfo.theirSignature)),
        };
    }
    async signLoginChallenge(challenge) {
        return (0, utils_1.signJWS)({
            sub: "challenge",
            alg: "ES384",
            jwk: await (0, utils_1.exportKey)(this.identityKeyPair.publicKey),
        }, challenge, this.identityKeyPair.privateKey);
    }
    async makeBackup(password) {
        const idJWKs = await (0, utils_1.exportKeyPair)(this.identityKeyPair);
        const storageJWKs = await (0, utils_1.exportKeyPair)(this.storageKeyPair);
        const encryptedIdentity = await (0, utils_1.encryptPrivateKey)(idJWKs.privateKeyJWK, password);
        const encryptedStorageKey = await (0, utils_1.encryptPrivateKey)(storageJWKs.privateKeyJWK, password);
        const payload = await this.storage.makeIdentityBackup(this.thumbprint, encryptedIdentity, encryptedStorageKey);
        return (0, utils_1.signJWS)({
            alg: "ES384",
            jwk: idJWKs.publicKeyJWK,
        }, payload, this.identityKeyPair.privateKey);
    }
    notifySubscribers() {
        for (const sub of this.subscriptions) {
            try {
                sub?.();
            }
            catch (e) {
                // Ignore
            }
        }
    }
    subscriptions = new Set();
    subscribe(onChange) {
        this.subscriptions ??= new Set();
        this.subscriptions.add(onChange);
        return () => {
            this.subscriptions.delete(onChange);
        };
    }
}
exports.Client = Client;
function incMessageId(messageId) {
    let nextId = parseInt(messageId, 16) + 1;
    if (nextId >= MAX_MESSAGE_ID) {
        nextId = 1;
    }
    (0, utils_1.invariant)(!Number.isNaN(nextId), `Invalid message id ${messageId} ${nextId}`);
    const n = nextId.toString(16);
    (0, utils_1.invariant)(!Number.isNaN(n), `Invalid message toString ${messageId} ${nextId}`);
    return n;
}
