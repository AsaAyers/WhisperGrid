type SynAckState = {
    syn: string | undefined;
    minAck: string | undefined;
    maxAck: string | undefined;
    missing: string[];
    windowSize: number;
};
declare const keySymbol: unique symbol;
type Visibility = "public" | "private";
type AlgorithmType = "ECDSA" | "ECDH";
type TaggedKey<T = [AlgorithmType, Visibility]> = CryptoKey & {
    [keySymbol]: T;
};
type EncryptedPrivateKey<T = AlgorithmType> = TaggedString<[
    T,
    "private"
]>;
type TaggedCryptoKeyPair<T = AlgorithmType> = {
    publicKey: TaggedKey<[T, "public"]>;
    privateKey: TaggedKey<[T, "private"]>;
};
type ECDSACryptoKeyPair = TaggedCryptoKeyPair<"ECDSA">;
type ECDHCryptoKeyPair = TaggedCryptoKeyPair<"ECDH">;
type JWK<T = "ECDSA" | "ECDH", V = Visibility> = JsonWebKey & {
    [keySymbol]: [T, V];
};
export type Thumbprint<T = AlgorithmType> = string & {
    [keySymbol]: T;
};
declare const objectType: unique symbol;
type TaggedString<T extends string | object> = string & {
    [objectType]: T;
};
export type UnpackTaggedString<T extends TaggedString<any>> = T extends TaggedString<infer U> ? U : never;
export type SignedTransport = SignedInvitation | SignedReplyToInvite | SignedReply;
export type SignedInvitation = TaggedString<Invitation>;
export type SignedReply = TaggedString<ReplyMessage>;
export type SignedReplyToInvite = TaggedString<ReplyToInvite>;
type SignedSelfEncrypted = TaggedString<SelfEncrypted>;
type SignedBackup = TaggedString<BackupJWS>;
type Encrypted<T extends string | object> = TaggedString<T>;
export type Invitation = {
    header: {
        alg: "ES384";
        iat: number;
        jwk: JWK<"ECDSA", "public">;
        sub: "grid-invitation";
    };
    payload: {
        messageId: string;
        epk: JWK<"ECDH", "public">;
        note?: string;
        nickname: string;
    };
};
type SelfEncrypted<P extends string | object = string> = {
    header: {
        alg: "ES384";
        iat: number;
        jwk: JWK<"ECDSA", "public">;
        sub: "self-encrypted";
        iv: string;
        epk: JWK<"ECDH", "public">;
    };
    payload: Encrypted<P>;
};
type ReplyToInvitePayload = {
    nickname: string;
    messageId: string;
    minAck: string;
    message: string;
    relay?: string;
};
type ReplyToInvite = {
    header: Omit<ReplyMessage["header"], "sub"> & {
        jwk: JWK<"ECDSA", "public">;
        invite: Thumbprint<"ECDH">;
        epk: JWK<"ECDH", "public">;
        iv: string;
        sub: "reply-to-invite";
    };
    payload: Encrypted<ReplyToInvitePayload>;
};
type ReplyPayload = {
    nickname?: string;
    messageId: string;
    epk?: JWK<"ECDH", "public">;
    relay?: string;
    message: string;
    minAck: string;
};
type ReplyMessage = {
    header: {
        alg: "ES384";
        iat: number;
        sub: "grid-reply";
        re: ThreadID;
        iv: string;
        from: Thumbprint<"ECDSA">;
    };
    payload: Encrypted<ReplyPayload>;
};
type BackupJWS = {
    header: {
        alg: "ES384";
        jwk: JWK<"ECDSA", "public">;
        iat: number;
    };
    payload: BackupPayload;
};
export type BackupPayload = {
    thumbprint: Thumbprint<"ECDSA">;
    identity: StoredIdentity;
    encryptedThreadKeys: Record<Thumbprint<"ECDH">, SignedSelfEncrypted>;
    threads: Record<ThreadID, {
        threadInfo: ThreadInfoData;
        messages: {
            min: string;
            max: string;
            messages: Array<SignedTransport>;
        };
    }>;
    invites?: Record<Thumbprint<"ECDH">, SignedInvitation>;
};
type ThreadInfoData = SynAckState & {
    signedInvite: SignedInvitation;
    myThumbprint: Thumbprint<"ECDH">;
    theirEPK: JWK<"ECDH", "public">;
    theirSignature: JWK<"ECDSA", "public">;
    relays: Record<Thumbprint<"ECDSA">, string>;
};
export type ThreadID = TaggedString<"ThreadID">;
type Key<Type extends StoredDataTypes["type"]> = `${Type}:${Extract<StoredDataTypes, {
    type: Type;
}>["keyType"]}`;
type GridStorageType = {
    hasItem<Type extends StoredDataTypes["type"]>(key: Key<Type>): boolean;
    removeItem: <Type extends StoredDataTypes["type"]>(key: Key<Type>) => null;
    queryItem: <Type extends StoredDataTypes["type"]>(key: Key<Type>) => Extract<StoredDataTypes, {
        type: Type;
    }>["data"] | null;
    getItem: <Type extends StoredDataTypes["type"]>(key: Key<Type>) => Extract<StoredDataTypes, {
        type: Type;
    }>["data"];
    setItem: <Type extends StoredDataTypes["type"]>(key: Key<Type>, value: Extract<StoredDataTypes, {
        type: Type;
    }>["data"]) => void;
    appendItem: <Type extends StoredDataTypes["type"], V extends Extract<StoredDataTypes, {
        type: Type;
    }>["data"]>(key: Key<Type>, value: V extends Array<any> ? V[number] : never, options?: {
        unique?: boolean;
    }) => void;
};
type StoredIdentity = {
    id: {
        jwk: JWK<"ECDSA", "public">;
        private: EncryptedPrivateKey<"ECDSA">;
    };
    storage: {
        jwk: JWK<"ECDH", "public">;
        private: EncryptedPrivateKey<"ECDH">;
    };
};
type StoredDataTypes = {
    type: "identity";
    keyType: Thumbprint<"ECDSA">;
    data: StoredIdentity;
} | {
    type: "thread-info";
    keyType: `${Thumbprint<"ECDSA">}:${ThreadID}`;
    data: ThreadInfoData;
} | {
    type: "invitation";
    keyType: Thumbprint<"ECDH">;
    data: SignedInvitation;
} | {
    type: "invitations";
    keyType: Thumbprint<"ECDSA">;
    data: Thumbprint<"ECDH">[];
} | {
    type: "keyed-messages";
    keyType: `${Thumbprint<"ECDSA">}:${ThreadID}`;
    data: {
        min: string;
        max: string;
        messages: Array<SignedTransport>;
    };
} | {
    type: "encrypted-thread-key";
    keyType: Thumbprint<"ECDH">;
    data: SignedSelfEncrypted;
} | {
    type: "threads";
    keyType: Thumbprint<"ECDSA">;
    data: Array<ThreadID>;
};
export class GridStorage implements GridStorageType {
    protected data: {
        get: (key: string) => any;
        has: (key: string) => boolean;
        delete: (key: string) => void;
        set: (key: string, value: any) => void;
    };
    debugData(): {
        [k: string]: any;
    };
    loadIdentityBackup(backup: BackupPayload): Promise<void>;
    makeIdentityBackup(thumbprint: Thumbprint<"ECDSA">, idPrivateKey: EncryptedPrivateKey<"ECDSA">, storagePrivateKey: EncryptedPrivateKey<"ECDH">): Promise<BackupPayload>;
    hasItem: GridStorageType["hasItem"];
    removeItem: GridStorageType["removeItem"];
    queryItem: GridStorageType["queryItem"];
    getItem: GridStorageType["getItem"];
    setItem: GridStorageType["setItem"];
    appendItem: GridStorageType["appendItem"];
    storeMessage(thumbprint: Thumbprint<"ECDSA">, threadId: ThreadID, messageId: string, message: SignedTransport): void;
    readMessages(thumbprint: Thumbprint<"ECDSA">, threadId: ThreadID): SignedTransport[];
}
export function setNickname(key: string, nickname: string): void;
export function getNickname(key: string): string;
export function setMessageIdForTesting(messageId: number): void;
export type DecryptedMessageType = {
    message: string;
    type: "invite" | "message";
    from: string;
    fromThumbprint: Thumbprint<"ECDSA">;
    iat: number;
    messageId: string;
    minAck: string | undefined;
    epkThumbprint: Thumbprint<"ECDH">;
    relay?: string;
};
export class Client {
    setClientNickname(nickname: string): Promise<void>;
    constructor(storage: GridStorage, thumbprint: Thumbprint<"ECDSA">, identityKeyPair: ECDSACryptoKeyPair, storageKeyPair: ECDHCryptoKeyPair);
    getThumbprint(): Promise<Thumbprint<"ECDSA">>;
    static generateClient(storage: GridStorage, password: string): Promise<Client>;
    static loadFromBackup(storage: GridStorage, backup: BackupPayload | SignedBackup, password: string): Promise<Client>;
    static loadClient(storage: GridStorage, thumbprint: Thumbprint<"ECDSA">, password: string): Promise<Client>;
    decryptFromSelf(message: SignedSelfEncrypted): Promise<string>;
    encryptToSelf(message: string): Promise<SignedSelfEncrypted>;
    createInvitation({ note, nickname, }: {
        note?: string;
        nickname: string;
    }): Promise<SignedInvitation>;
    replyToInvitation(signedInvite: SignedInvitation, message: string, nickname: string, { setMyRelay }?: {
        setMyRelay?: string;
    }): Promise<{
        reply: SignedReply;
        threadId: ThreadID;
        relay?: string;
    }>;
    getThreads(): Promise<ThreadID[]>;
    getInvitationIds(): Promise<Thumbprint<"ECDH">[]>;
    getInvitations(): Promise<SignedInvitation[]>;
    getInvitation(thumbprint: Thumbprint<"ECDH">): Promise<SignedInvitation>;
    replyToThread(threadId: ThreadID, message: string, options?: {
        selfSign?: boolean;
        nickname?: string;
        setMyRelay?: string;
    }): Promise<{
        reply: SignedReply;
        threadId: ThreadID;
        relay?: string;
    }>;
    appendThread(encryptedMessage: SignedTransport, threadId?: ThreadID): Promise<{
        threadId: ThreadID;
        message: {
            message: string;
            type: "invite" | "message";
        };
        relay?: string;
    }>;
    decryptThread(threadId: ThreadID): Promise<DecryptedMessageType[]>;
    decryptMessage(threadId: ThreadID, encryptedMessage: SignedTransport): Promise<DecryptedMessageType>;
    getEncryptedThread(threadId: ThreadID): Promise<SignedTransport[]>;
    getThreadInfo(thread: ThreadID): Promise<{
        myRelay: string;
        myNickname: string;
        theirNickname: string;
    }>;
    makeBackup(password: string): Promise<SignedBackup>;
    subscribe(onChange: () => void): () => void;
}
export function incMessageId(messageId: string): string;

//# sourceMappingURL=types.d.ts.map
