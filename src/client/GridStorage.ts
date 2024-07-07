/* eslint-disable @typescript-eslint/no-explicit-any */
import { incMessageId } from ".";
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
  keyType: ThreadID;
  data: {
    min: string;
    max: string;
    messages: {
      [messageId: string]: SignedTransport;
    };
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
  | KeyedMessageIndex
  | {
      type: "out-of-order";
      keyType: ThreadID;
      data: Record<string, SignedTransport>;
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

export class GridStorage implements GridStorageType {
  private data = new Map<string, any>();

  getData() {
    return Object.fromEntries(this.data.entries());
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

  public storeMesage(
    threadId: ThreadID,
    messageId: string,
    message: SignedTransport
  ) {
    const index = this.queryItem(`keyed-messages:${threadId}`) ?? {
      min: messageId,
      max: messageId,
      messages: {},
    };
    index.messages[messageId] = message;
    if (messageId < index.min) {
      index.min = messageId;
    } else if (messageId > index.max) {
      index.max = messageId;
    }
    this.setItem(`keyed-messages:${threadId}`, index);
  }
  public readMessages(threadId: ThreadID) {
    const { min, max, messages } = this.getItem(`keyed-messages:${threadId}`);
    let id = min;
    const messageArray: Array<
      SignedTransport | { type: "missing"; messageId: string }
    > = [];
    while (id <= max) {
      const message = messages[id];
      if (message) {
        messageArray.push(message);
      } else {
        messageArray.push({
          type: "missing",
          messageId: id,
        });
      }
      id = incMessageId(id);
    }
    return messageArray;
  }
}
