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
    messageId: number;
    threadJWK: JsonWebKey;
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
