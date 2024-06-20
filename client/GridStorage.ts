import { KJUR } from "jsrsasign";
import { SignedInvitation, TaggedString } from "./types";

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
      type: "identity";
      data: {
        id: {
          jwk: JsonWebKey;
          private: string;
        };
        storage: {
          jwk: JsonWebKey;
          private: string;
        };
      };
    }
  | {
      type: "thread-info";
      data: {
        thumbprint: string;
        threadThumbprint: string;
        threadJWK: JsonWebKey;
      };
    }
  | { type: "invitation"; data: SignedInvitation }
  | { type: "messages"; data: Array<string> }
  | { type: "encrypted-thread-key"; data: string }
  | { type: "message-id"; data: number }
  | { type: "threads"; data: Array<string> };

export class TestStorage implements GridStorage {
  private data: Record<string, any> = {};

  getData() {
    return this.data;
  }

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
