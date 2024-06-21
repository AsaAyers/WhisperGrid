import { KJUR } from "jsrsasign";

const objectType = Symbol("objectType");
export type TaggedString<T extends string | object> = string & {
  [objectType]: T;
};

export type SignedInvitation = TaggedString<Invitation>;

export type Invitation = {
  header: {
    alg: "ES384";
    jwk: JsonWebKey;
  };
  payload: {
    messageId: string;
    epk: JsonWebKey;
    note?: string;
    nickname?: string;
  };
};

export type SelfEncrypted = {
  header: {
    alg: "ES384";
    jwk: JsonWebKey;
  };
  payload: {
    message: string;
    iv: string;
    epk: JsonWebKey;
  };
};

export type ReplyMessage = {
  header: { alg: "ES384"; jwk?: JsonWebKey };
  payload: {
    re: string;
    messageId: string;
    epk?: JsonWebKey;
    message: string;
    iv: string;
  };
};
