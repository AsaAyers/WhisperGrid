"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GridStorage = void 0;
const utils_1 = require("./utils");
class GridStorage {
    data = new Map();
    debugData() {
        return Object.fromEntries(this.data.entries());
    }
    async loadIdentityBackup(backup) {
        this.setItem(`identity:${backup.thumbprint}`, backup.identity);
        Object.entries(backup.invites ?? {}).forEach(([key, value]) => {
            this.appendItem(`invitations:${backup.thumbprint}`, key, { unique: true });
            this.setItem(`invitation:${key}`, value);
        });
        Object.entries(backup.encryptedThreadKeys).forEach(([thumbprint, key]) => {
            this.setItem(`encrypted-thread-key:${thumbprint}`, key);
        });
        Object.entries(backup.threads).forEach(([id, thread]) => {
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
            thumbprint,
            identity: {
                id: {
                    jwk: identity.id.jwk,
                    private: idPrivateKey,
                },
                storage: {
                    jwk: identity.storage.jwk,
                    private: storagePrivateKey,
                },
            },
            invites: this.queryItem(`invitations:${thumbprint}`)?.reduce((memo, key) => {
                memo[key] = this.getItem(`invitation:${key}`);
                encryptedThreadKeys[key] = this.getItem(`encrypted-thread-key:${key}`);
                return memo;
            }, {}),
            threads: (await this.queryItem(`threads:${thumbprint}`)?.reduce(async (m, key) => {
                const memo = await m;
                const threadInfo = this.getItem(`thread-info:${thumbprint}:${key}`);
                const messages = this.getItem(`keyed-messages:${thumbprint}:${key}`);
                encryptedThreadKeys[threadInfo.myThumbprint] = this.getItem(`encrypted-thread-key:${threadInfo.myThumbprint}`);
                memo[key] = {
                    threadInfo,
                    messages,
                };
                return memo;
            }, Promise.resolve({}))) ?? {},
            encryptedThreadKeys,
        };
    }
    hasItem = (key) => {
        return this.data.has(key);
    };
    removeItem = (key) => {
        this.data.delete(key);
        return null;
    };
    queryItem = (key) => {
        return this.data.get(key);
    };
    getItem = (key) => {
        (0, utils_1.invariant)(this.hasItem(key), `Key ${key} not found in storage.`);
        return this.data.get(key);
    };
    setItem = (key, value) => {
        this.data.set(key, value);
    };
    appendItem = (key, value, { unique = false } = {}) => {
        let arr = this.queryItem(key);
        if (!Array.isArray(arr)) {
            arr = [];
        }
        if (unique && arr.includes(value)) {
            return;
        }
        arr.push(value);
        this.setItem(key, arr);
    };
    storeMessage(thumbprint, threadId, messageId, message) {
        const index = this.queryItem(`keyed-messages:${thumbprint}:${threadId}`) ?? {
            min: messageId,
            max: messageId,
            messages: [],
        };
        index.messages.push(message);
        this.setItem(`keyed-messages:${thumbprint}:${threadId}`, index);
    }
    readMessages(thumbprint, threadId) {
        const { messages } = this.getItem(`keyed-messages:${thumbprint}:${threadId}`);
        return messages;
    }
}
exports.GridStorage = GridStorage;
