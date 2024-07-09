/* eslint-disable @typescript-eslint/no-explicit-any */
import { SynAckState } from "./synAck";
import {
  SignedInvitation,
  SignedSelfEncrypted,
  SignedTransport,
  TaggedString,
} from "./types";
import { EncryptedPrivateKey, invariant, JWK, Thumbprint } from "./utils";

export type ThreadID = TaggedString<"ThreadID">;

type Key<Type extends StoredDataTypes["type"]> = `${Type}:${Extract<
  StoredDataTypes,
  { type: Type }
>["keyType"]}`;
export type GridStorageType = {
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

type KeyedMessageIndex = {
  type: "keyed-messages";
  keyType: `${Thumbprint<"ECDSA">}:${ThreadID}`;
  data: {
    min: string;
    max: string;
    messages: Array<SignedTransport>;
  };
};

type ThreadInfoData = SynAckState & {
  signedInvite: SignedInvitation;
  myThumbprint: Thumbprint<"ECDH">;
  theirEPK: JWK<"ECDH", "public">;
  theirSignature: JWK<"ECDSA", "public">;
};

type StoredDataTypes =
  | {
      type: "identity";
      keyType: Thumbprint<"ECDSA">;
      data: StoredIdentity;
    }
  | {
      type: "thread-info";
      keyType: `${Thumbprint<"ECDSA">}:${ThreadID}`;
      data: ThreadInfoData;
    }
  | { type: "invitation"; keyType: Thumbprint<"ECDH">; data: SignedInvitation }
  | { type: "invitations"; keyType: string; data: Thumbprint<"ECDH">[] }
  | KeyedMessageIndex
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
  | { type: "threads"; keyType: Thumbprint<"ECDSA">; data: Array<ThreadID> };

export class GridStorage implements GridStorageType {
  protected data: {
    get: (key: string) => any;
    has: (key: string) => boolean;
    delete: (key: string) => void;
    set: (key: string, value: any) => void;
  } = new Map<string, any>();

  debugData() {
    return Object.fromEntries((this.data as any).entries());
  }

  hasItem: GridStorageType["hasItem"] = (key) => {
    return this.data.has(key);
  };

  removeItem: GridStorageType["removeItem"] = (key) => {
    this.data.delete(key);
    return null;
  };

  queryItem: GridStorageType["queryItem"] = (key) => {
    return this.data.get(key);
  };

  getItem: GridStorageType["getItem"] = (key) => {
    invariant(this.hasItem(key), `Key ${key} not found in storage.`);
    return this.data.get(key);
  };

  setItem: GridStorageType["setItem"] = (key, value) => {
    this.data.set(key, value);
  };

  appendItem: GridStorageType["appendItem"] = (key, value) => {
    let arr: any = this.queryItem(key);
    if (!Array.isArray(arr)) {
      arr = [];
    }
    arr.push(value);
    this.setItem(key, arr);
  };

  public storeMessage(
    thumbprint: Thumbprint<"ECDSA">,
    threadId: ThreadID,
    messageId: string,
    message: SignedTransport
  ) {
    const index = this.queryItem(
      `keyed-messages:${thumbprint}:${threadId}`
    ) ?? {
      min: messageId,
      max: messageId,
      messages: [],
    };
    index.messages.push(message);
    this.setItem(`keyed-messages:${thumbprint}:${threadId}`, index);
  }
  public readMessages(thumbprint: Thumbprint<"ECDSA">, threadId: ThreadID) {
    const { messages } = this.getItem(
      `keyed-messages:${thumbprint}:${threadId}`
    );
    return messages;
  }
}
