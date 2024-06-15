import { KJUR } from "jsrsasign";
import { SignedInvitation, TaggedString } from "./types";

type JsonWebKey = KJUR.jws.JWS.JsonWebKey;

export type GridStorage = {
  removeItem: (key: `${StoredDataTypes["type"]}:${string}`) => null;
  getItem: <Type extends StoredDataTypes["type"]>(
    key: `${Type}:${string}`
  ) => Extract<StoredDataTypes, { type: Type }>["data"] | null;
  setItem: <Type extends StoredDataTypes["type"]>(
    key: `${Type}:${string}`,
    value: Extract<StoredDataTypes, { type: Type }>["data"]
  ) => void;
  appendItem: <
    Type extends StoredDataTypes["type"],
    V extends Extract<StoredDataTypes, { type: Type }>["data"]
  >(
    key: `${Type}:${string}`,
    value: V extends Array<any> ? V[number] : never
  ) => void;
};
type StoredDataTypes =
  | {
      type: "private-key";
      data: {
        privateKey: KJUR.crypto.ECDSA;
        jwk: JsonWebKey;
      };
    }
  | { type: "PEM"; data: TaggedString<"PEM"> }
  | { type: "invitation"; data: SignedInvitation }
  | { type: "messages"; data: Array<string> }
  | { type: "public-key"; data: JsonWebKey }
  | { type: "thread-key"; data: CryptoKey }
  | { type: "messageId"; data: number }
  | { type: "threads"; data: Array<{ fingerprint: string }> };

export class TestStorage implements GridStorage {
  private data: Record<string, any> = {};

  removeItem(key: `${StoredDataTypes["type"]}:${string}`) {
    delete this.data[key];
    return null;
  }

  getItem: GridStorage["getItem"] = (key) => {
    return this.data[key] ?? null;
  };

  setItem: GridStorage["setItem"] = (key, value) => {
    this.data[key] = value;
  };

  appendItem: GridStorage["appendItem"] = (key, value) => {
    if (!Array.isArray(this.data[key])) {
      this.data[key] = [];
    }
    this.data[key].push(value);
  };
}
