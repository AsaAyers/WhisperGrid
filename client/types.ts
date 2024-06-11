import { KJUR } from "jsrsasign";

export type JsonWebKey = KJUR.jws.JWS.JsonWebKey;
const objectType = Symbol("objectType");
export type TaggedString<T extends string | object> = string & {
  [objectType]: T;
};

export type SignedInvitation = TaggedString<Invitation>;

export type Invitation = {
  header: {
    alg: "ES256";
    jwk: JsonWebKey;
  };
  payload: {
    messageId: number;
    threadJWK: JsonWebKey;
    note?: string;
    nickname?: string;
  };
};
