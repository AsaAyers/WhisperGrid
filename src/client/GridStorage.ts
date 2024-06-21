import { KJUR } from "jsrsasign";
import { SignedInvitation, TaggedString } from "./types";
import { EncryptedPrivateKey, JWK, Thumbprint } from "./utils";

export type GridStorage = {
  hasItem(key: string): boolean;
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
export type StoredIdentity = {
  id: {
    jwk: JWK<"ECDSA", "public">;
    private: EncryptedPrivateKey<"ECDSA">;
  };
  storage: {
    jwk: JWK<"ECDH", "public">;
    private: EncryptedPrivateKey<"ECDH">;
  };
};

type StoredDataTypes =
  | {
      type: "identity";
      data: StoredIdentity;
    }
  | {
      type: "thread-info";
      data: {
        signedInvite: SignedInvitation;
        myThumbprint: Thumbprint<"ECDH">;
        theirEPK: JWK<"ECDH", "public">;
        theirSignature: JWK<"ECDSA", "public">;
      };
    }
  | { type: "invitation"; data: SignedInvitation }
  | { type: "messages"; data: Array<string> }
  | { type: "encrypted-thread-key"; data: string }
  | { type: "public-key"; data: JWK<"ECDSA" | "ECDH", "public"> }
  | { type: "message-id"; data: string }
  | { type: "threads"; data: Array<string> };

export class TestStorage implements GridStorage {
  private data = new Map<string, any>();

  getData() {
    return Object.fromEntries(this.data.entries());
  }

  hasItem(key: string): boolean {
    return this.data.has(key);
  }

  removeItem(key: `${StoredDataTypes["type"]}:${string}`) {
    this.data.delete(key);
    return null;
  }

  getItem: GridStorage["getItem"] = (key) => {
    return this.data.get(key);
  };

  setItem: GridStorage["setItem"] = (key, value) => {
    this.data.set(key, value);
  };

  appendItem: GridStorage["appendItem"] = (key, value) => {
    let arr = this.data.get(key);
    if (!Array.isArray(arr)) {
      arr = [];
    }
    arr.push(value);
    this.data.set(key, arr);
  };
}
