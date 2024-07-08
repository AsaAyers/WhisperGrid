/* eslint-disable @typescript-eslint/no-explicit-any */
import { ThreadID } from "./GridStorage";
import { EncryptedPrivateKey, JWK, Thumbprint } from "./utils";

const objectType = Symbol("objectType");
export type TaggedString<T extends string | object> = string & {
  [objectType]: T;
};

export type UnpackTaggedString<T extends TaggedString<any>> =
  T extends TaggedString<infer U> ? U : never;

export type SignedTransport =
  | SignedInvitation
  | SignedReplyToInvite
  | SignedReply;

export type SignedInvitation = TaggedString<Invitation>;
export type SignedReply = TaggedString<ReplyMessage>;
export type SignedReplyToInvite = TaggedString<ReplyToInvite>;
export type SignedSelfEncrypted = TaggedString<SelfEncrypted>;
export type SignedBackup = TaggedString<BackupJWS>;
export type Encrypted<T extends string | object> = TaggedString<T>;
export type Decrypted<T extends object> = T extends {
  header: infer H;
  payload: Encrypted<infer U>;
}
  ? { payload: U; header: H }
  : void;

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

export type SelfEncrypted<P extends string | object = string> = {
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

export type ReplyToInvitePayload = {
  nickname: string;
  messageId: string;
  minAck: string;
  message: string;
};

export type ReplyToInvite = {
  header: Omit<ReplyMessage["header"], "sub"> & {
    jwk: JWK<"ECDSA", "public">;
    invite: Thumbprint<"ECDH">;
    epk: JWK<"ECDH", "public">;
    iv: string;
    sub: "reply-to-invite";
  };
  payload: Encrypted<ReplyToInvitePayload>;
};
export type ReplyPayload = {
  nickname?: string;
  messageId: string;
  epk?: JWK<"ECDH", "public">;
  message: string;
  minAck: string;
};

export type ReplyMessage = {
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

export type BackupJWS = {
  header: {
    alg: "ES384";
    jwk: JWK<"ECDSA", "public">;
    iat: number;
  };
  payload: BackupPayload;
};
export type BackupPayload = {
  thumbprint: Thumbprint<"ECDSA">;
  encryptedIdentity: EncryptedPrivateKey<"ECDSA">;
  encryptedStorageKey: EncryptedPrivateKey<"ECDH">;
  idJWK: JWK<"ECDSA", "public">;
  storageJWK: JWK<"ECDH", "public">;
  invitations?: SignedInvitation[];
  threads: Record<string, any>;
};
