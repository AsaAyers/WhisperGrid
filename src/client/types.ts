import { JWK, Thumbprint } from "./utils";

const objectType = Symbol("objectType");
export type TaggedString<T extends string | object> = string & {
  [objectType]: T;
};

export type SignedInvitation = TaggedString<Invitation>;
export type SignedReply = TaggedString<ReplyMessage>;
export type SignedSelfEncrypted = TaggedString<SelfEncrypted>;

export type Invitation = {
  header: {
    alg: "ES384";
    jwk: JWK<"ECDSA", "public">;
  };
  payload: {
    sub: "grid-invitation";
    messageId: string;
    epk: JWK<"ECDH", "public">;
    note?: string;
    nickname: string;
  };
};

export type SelfEncrypted = {
  header: {
    alg: "ES384";
    jwk: JWK<"ECDSA", "public">;
  };
  payload: {
    sub: "self-encrypted";
    message: string;
    iv: string;
    epk: JWK<"ECDH", "public">;
  };
};

export type ReplyMessage = {
  header: { alg: "ES384"; jwk?: JWK<"ECDSA", "public"> };
  payload: {
    sub: "grid-reply";
    re: Thumbprint;
    nickname?: string;
    messageId: string;
    epk?: JWK<"ECDH", "public">;
    message: string;
    iv: string;
  };
};
