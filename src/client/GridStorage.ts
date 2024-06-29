/* eslint-disable @typescript-eslint/no-explicit-any */
import { SignedInvitation, SignedReply } from "./types";
import { EncryptedPrivateKey, JWK, Thumbprint } from "./utils";

type Key = `${StoredDataTypes["type"]}:${string}`;
export type GridStorage = {
  hasItem(key: Key): boolean;
  removeItem: (key: Key) => null;
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
  | { type: "invitations"; data: Thumbprint<"ECDH">[] }
  | { type: "messages"; data: Array<SignedInvitation | SignedReply> }
  | { type: "encrypted-thread-key"; data: string }
  | { type: "public-key"; data: JWK<"ECDSA" | "ECDH", "public"> }
  | { type: "message-id"; data: string }
  | { type: "threads"; data: Array<Thumbprint<"ECDH">> };

export class TestStorage implements GridStorage {
  private data = new Map<string, any>();

  getData() {
    return Object.fromEntries(this.data.entries());
  }

  hasItem(key: Key): boolean {
    return this.data.has(key);
  }

  removeItem(key: Key) {
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
    let arr: any = this.getItem(key);
    if (!Array.isArray(arr)) {
      arr = [];
    }
    // TODO: Make this detect duplicates and out of order messages.  I think for
    // the moment, I can de-duple the last one since the invitation seems to
    // keep getting duplicated a bunch of times.
    if (value[arr.length - 1] !== value) {
      console.warn("Appending", key);
      // console.log('Appending', key)
      arr.push(value);
    } else {
      console.log("Skipping duplicate", key);
    }
    this.setItem(key, arr);
  };
}
