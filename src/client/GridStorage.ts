/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  SignedInvitation,
  SignedReply,
  SignedReplyToInvite,
  SignedSelfEncrypted,
  TaggedString,
} from "./types";
import { EncryptedPrivateKey, invariant, JWK, Thumbprint } from "./utils";

export type ThreadID = TaggedString<"ThreadID">;

type Key<Type extends StoredDataTypes["type"]> = `${Type}:${Extract<
  StoredDataTypes,
  { type: Type }
>["keyType"]}`;
export type GridStorage = {
  hasItem<Type extends StoredDataTypes["type"]>(key: Key<Type>): boolean;
  removeItem: <Type extends StoredDataTypes["type"]>(key: Key<Type>) => null;
  queryItem: <Type extends StoredDataTypes["type"]>(
    key: Key<Type>
  ) => Extract<StoredDataTypes, { type: Type }>["data"] | null;
  getItem: <Type extends StoredDataTypes["type"]>(
    key: Key<Type>
  ) => Extract<StoredDataTypes, { type: Type }>["data"];
  setItem: <Type extends StoredDataTypes["type"]>(
    key: Key<Type>,
    value: Extract<StoredDataTypes, { type: Type }>["data"]
  ) => void;
  appendItem: <
    Type extends StoredDataTypes["type"],
    V extends Extract<StoredDataTypes, { type: Type }>["data"]
  >(
    key: Key<Type>,
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
      keyType: string;
      data: StoredIdentity;
    }
  | {
      type: "thread-info";
      keyType: ThreadID;
      data: {
        signedInvite: SignedInvitation;
        myThumbprint: Thumbprint<"ECDH">;
        theirEPK: JWK<"ECDH", "public">;
        theirSignature: JWK<"ECDSA", "public">;
      };
    }
  | { type: "invitation"; keyType: Thumbprint<"ECDH">; data: SignedInvitation }
  | { type: "invitations"; keyType: string; data: Thumbprint<"ECDH">[] }
  | {
      type: "messages";
      keyType: string;
      data: Array<SignedInvitation | SignedReply | SignedReplyToInvite>;
    }
  | {
      type: "encrypted-thread-key";
      keyType: Thumbprint<"ECDH">;
      data: SignedSelfEncrypted;
    }
  | {
      type: "public-key";
      keyType: Thumbprint;
      data: JWK<"ECDSA" | "ECDH", "public">;
    }
  | { type: "message-id"; keyType: ThreadID; data: string }
  | { type: "threads"; keyType: string; data: Array<ThreadID> };

export class TestStorage implements GridStorage {
  private data = new Map<string, any>();

  getData() {
    return Object.fromEntries(this.data.entries());
  }

  hasItem: GridStorage["hasItem"] = (key) => {
    return this.data.has(key);
  };

  removeItem: GridStorage["removeItem"] = (key) => {
    this.data.delete(key);
    return null;
  };

  queryItem: GridStorage["queryItem"] = (key) => {
    return this.data.get(key);
  };

  getItem: GridStorage["getItem"] = (key) => {
    invariant(this.hasItem(key), `Key ${key} not found in storage.`);
    return this.data.get(key);
  };

  setItem: GridStorage["setItem"] = (key, value) => {
    this.data.set(key, value);
  };

  appendItem: GridStorage["appendItem"] = (key, value) => {
    let arr: any = this.queryItem(key);
    if (!Array.isArray(arr)) {
      arr = [];
    }
    // TODO: Make this detect duplicates and out of order messages.  I think for
    // the moment, I can de-duple the last one since the invitation seems to
    // keep getting duplicated a bunch of times.
    if (value[arr.length - 1] !== value) {
      // console.log('Appending', key)
      arr.push(value);
    } else {
      // console.log("Skipping duplicate", key);
    }
    this.setItem(key, arr);
  };
}
