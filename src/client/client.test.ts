/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, incMessageId, setMessageIdForTesting } from "./index";
import {
  deriveSharedSecret,
  exportKeyPair,
  importKeyPair,
  parseJWS,
} from "./utils";
import { generateECDHKeyPair } from "./utils";
import { GridStorage, ThreadID } from "./GridStorage";
import crypto from "crypto";

import { ArrayBuffertohex } from "jsrsasign";
import { synAck, SynAckState } from "./synAck";
import { SignedReply } from "./types";

global.window ??= {} as any;
// @ts-expect-error This is a hack to make this look more like the browser for testing
window.crypto = crypto;

describe("Client", () => {
  beforeEach(() => {
    setMessageIdForTesting(1);
  });

  test("bad password", async () => {
    const storage = new GridStorage();

    const alice = await Client.generateClient(storage, "AlicePassword");
    const aliceThumbprint = await alice.getThumbprint();
    const aliceBackup = await alice.makeBackup("AlicePassword");

    await expect(
      Client.loadClient(storage, aliceThumbprint, "wrong-password")
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The operation failed for an operation-specific reason"`
    );

    await expect(
      Client.loadFromBackup(storage, aliceBackup, "wrong-password")
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The operation failed for an operation-specific reason"`
    );
  });

  test("Alice and Bob all new keys", async () => {
    const aliceStorage = new GridStorage();
    const Alice = await Client.generateClient(aliceStorage, "AliceP@ssw0rd");
    Alice.setClientNickname("Alice");
    const Bob = await Client.generateClient(new GridStorage(), "B0bP@ssw0rd");
    Bob.setClientNickname("Bob");

    const invitation = await Alice.createInvitation({
      nickname: "Alice",
      note: "Hello Bob, this first message is not encrypted, but is signed",
    });
    const toAlice = await Bob.replyToInvitation(
      invitation,
      "Hello Alice, 1st message",
      "Bob"
    );
    const threadId = toAlice.threadId;
    const aliceView = await Alice.appendThread(toAlice.reply);
    expect(aliceView.message.message).toMatchInlineSnapshot(
      `"Hello Alice, 1st message"`
    );
    expect(await debugConverastion(Alice, threadId)).toMatchInlineSnapshot(`
[
  "[invite] Alice: Invite from Alice.
Note: Hello Bob, this first message is not encrypted, but is signed",
  "[message] Bob: Hello Alice, 1st message",
]
`);

    const toBob = await Alice.replyToThread(threadId, "Hello Bob, 1st reply");

    const bobView = await Bob.appendThread(toBob.reply);
    expect(bobView.message.message).toMatchInlineSnapshot(
      `"Hello Bob, 1st reply"`
    );

    const toAlice2 = await Bob.replyToThread(threadId, "2nd message");
    const aliceView2 = await Alice.appendThread(toAlice2.reply);
    expect(aliceView2.message.message).toMatchInlineSnapshot(`"2nd message"`);

    const a = await debugConverastion(Alice, threadId);
    const b = await debugConverastion(Bob, threadId);
    expect(a).toMatchInlineSnapshot(`
[
  "[invite] Alice: Invite from Alice.
Note: Hello Bob, this first message is not encrypted, but is signed",
  "[message] Bob: Hello Alice, 1st message",
  "[message] Alice: Hello Bob, 1st reply",
  "[message] Bob: 2nd message",
]
`);
    expect(b).toMatchInlineSnapshot(`
[
  "[invite] Alice: Invite from Alice.
Note: Hello Bob, this first message is not encrypted, but is signed",
  "[message] Bob: Hello Alice, 1st message",
  "[message] Alice: Hello Bob, 1st reply",
  "[message] Bob: 2nd message",
]
`);
    expect(a).toMatchObject(b);
    expect(
      ArrayBuffertohex(window.crypto.getRandomValues(new Uint8Array(64)).buffer)
    ).toHaveLength(128);
  });

  test("deriveSharedSecret", async () => {
    const [a, b] = await Promise.all([
      generateECDHKeyPair()
        .then(exportKeyPair)
        .then((t) => importKeyPair(t)),
      generateECDHKeyPair()
        .then(exportKeyPair)
        .then((t) => importKeyPair(t)),
    ]);

    const secretA = await deriveSharedSecret(a.privateKey, b.publicKey);
    const secretB = await deriveSharedSecret(b.privateKey, a.publicKey);

    const message = "Hello World";

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedA = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      secretA,
      new TextEncoder().encode(message)
    );
    const encryptedB = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      secretB,
      new TextEncoder().encode(message)
    );

    expect(encryptedA).toEqual(encryptedB);
  });

  test("Backup and restore", async () => {
    const storage = new GridStorage();
    let alice = await Client.generateClient(storage, "AlicePassword");
    alice.setClientNickname("Alice");
    const invitation = await alice.createInvitation({
      nickname: "Alice",
      note: "Hello Bob, this first message is public.",
    });
    const bob = await Client.generateClient(new GridStorage(), "BobPassword");
    await bob.replyToInvitation(invitation, "Hello Alice", "Bob");

    const invitations = alice.getInvitations();

    const encryptedThreads = Object.fromEntries(
      (await alice.getThreads()).map((id) => [id, alice.getEncryptedThread(id)])
    );

    const backup = await alice.makeBackup("BackupPassword");
    const jws = await parseJWS(backup);
    alice = await Client.loadFromBackup(
      new GridStorage(),
      jws.payload,
      "BackupPassword"
    );

    expect(alice.getInvitations()).toEqual(invitations);

    expect(
      Object.fromEntries(
        (await alice.getThreads()).map((id) => [
          id,
          alice.getEncryptedThread(id),
        ])
      )
    ).toMatchObject(encryptedThreads);
  });

  test("ReplyToInvite can include a relay", async () => {
    const alice = await Client.generateClient(
      new GridStorage(),
      "AlicePassword"
    );
    alice.setClientNickname("Alice");
    const bob = await Client.generateClient(new GridStorage(), "BobPassword");
    bob.setClientNickname("Bob");
    const invite = await alice.createInvitation({ nickname: "Alice" });

    const messages = [];

    const topicArray = window.crypto.getRandomValues(new Uint8Array(16));

    const relayURL = `https://grid.example.com/conversation/${ArrayBuffertohex(
      topicArray.buffer
    )}`;
    messages.push(
      await bob.replyToInvitation(
        invite,
        `Hello Alice. First message with relay`,
        "Bob",
        {
          setMyRelay: relayURL,
        }
      )
    );
    const threadId = messages[0].threadId;
    await alice.appendThread(messages[0].reply);

    messages.push(
      await bob.replyToThread(threadId, `Hello Alice. Second message`)
    );
    await alice.appendThread(messages[1].reply);
    const aliceReply = await alice.replyToThread(
      threadId,
      `Hello Bob. First reply`
    );
    expect(aliceReply.relay).toBe(relayURL);
  });

  test("Replies can include a relay", async () => {
    const alice = await Client.generateClient(
      new GridStorage(),
      "AlicePassword"
    );
    alice.setClientNickname("Alice");
    const bob = await Client.generateClient(new GridStorage(), "BobPassword");
    bob.setClientNickname("Bob");
    const invite = await alice.createInvitation({ nickname: "Alice" });

    const messages = [];

    messages.push(
      await bob.replyToInvitation(invite, `Hello Alice. First message`, "Bob")
    );
    const threadId = messages[0].threadId;
    await alice.appendThread(messages[0].reply);

    messages.push(
      await bob.replyToThread(threadId, `Hello Alice. Second message`, {
        setMyRelay: `https://grid.example.com/conversation/${threadId}`,
      })
    );
    await alice.appendThread(messages[1].reply);
    const aliceReply = await alice.replyToThread(
      threadId,
      `Hello Bob. First reply`
    );
    expect(aliceReply.relay).toBe(
      `https://grid.example.com/conversation/${threadId}`
    );
  });

  test("Messages are displayed correctly even when arriving out of order", async () => {
    const alice = await Client.generateClient(
      new GridStorage(),
      "AlicePassword"
    );
    alice.setClientNickname("Alice");
    const bob = await Client.generateClient(new GridStorage(), "BobPassword");
    bob.setClientNickname("Bob");
    const invite = await alice.createInvitation({ nickname: "Alice" });

    const replies: {
      reply: SignedReply;
      threadId: ThreadID;
    }[] = [];
    let nextId = 1;
    replies.push(
      await bob.replyToInvitation(
        invite,
        `Hello Alice. Message ${nextId++}`,
        "Bob"
      )
    );
    const threadId = replies[0].threadId;

    replies.push(
      await bob.replyToThread(threadId, `Hello Alice, message ${nextId++}`)
    );
    replies.push(
      await bob.replyToThread(threadId, `Hello Alice, message ${nextId++}`)
    );
    replies.push(
      await bob.replyToThread(threadId, `Hello Alice, message ${nextId++}`)
    );
    replies.push(
      await bob.replyToThread(threadId, `Hello Alice, message ${nextId++}`)
    );
    replies.push(
      await bob.replyToThread(threadId, `Hello Alice, message ${nextId++}`)
    );
    replies.push(
      await bob.replyToThread(threadId, `Hello Alice, message ${nextId++}`)
    );
    replies.push(
      await bob.replyToThread(threadId, `Hello Alice, message ${nextId++}`)
    );
    replies.push(
      await bob.replyToThread(threadId, `Hello Alice, message ${nextId++}`)
    );

    await alice.appendThread(replies[0].reply);
    const toBob = await alice.replyToThread(threadId, `Hello Bob`);
    await bob.appendThread(toBob.reply);
    expect(await debugConverastion(alice, threadId)).toMatchInlineSnapshot(`
[
  "[invite] Alice: Invite from Alice.
Note: (none)",
  "[message] Bob: Hello Alice. Message 1",
  "[message] Alice: Hello Bob",
]
`);
    await alice.appendThread(replies[2].reply);
    await alice.appendThread(replies[2].reply);
    expect(await debugConverastion(alice, threadId)).toMatchInlineSnapshot(`
[
  "[invite] Alice: Invite from Alice.
Note: (none)",
  "[message] Bob: Hello Alice. Message 1",
  "[message] Alice: Hello Bob",
  "[message] Bob: Hello Alice, message 3",
]
`);

    // await alice.appendThread(replies[0]);
    await alice.appendThread(replies[1].reply);
    await alice.appendThread(replies[1].reply);
    await alice.appendThread(replies[1].reply);

    await expect(
      alice.appendThread(replies[6].reply)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Missing 5 messages between 100002 and 100007"`
    );

    expect(await debugConverastion(alice, threadId)).toMatchInlineSnapshot(`
[
  "[invite] Alice: Invite from Alice.
Note: (none)",
  "[message] Bob: Hello Alice. Message 1",
  "[message] Alice: Hello Bob",
  "[message] Bob: Hello Alice, message 2",
  "[message] Bob: Hello Alice, message 3",
]
`);
  });

  describe("synAckHandler", () => {
    test("syn Sequential messages", async () => {
      const state: SynAckState = {
        syn: undefined,
        minAck: undefined,
        maxAck: undefined,
        windowSize: 5,
        missing: [],
      };

      synAck({ syn: "10" }, state);
      synAck({ syn: "11" }, state);
      synAck({ syn: "12" }, state);
      synAck({ syn: "13" }, state);
      expect(state.syn).toBe("13");
    });
    test('syn "out of order" messages', async () => {
      const state: SynAckState = {
        syn: undefined,
        minAck: undefined,
        maxAck: undefined,
        windowSize: 5,
        missing: [],
      };

      synAck({ syn: "10" }, state);
      expect(() =>
        synAck({ syn: "12" }, state)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Syn out of order 12 - Expected: 11"`
      );
    });
    test("ack sequential messages", () => {
      const state: SynAckState = {
        syn: undefined,
        minAck: undefined,
        maxAck: undefined,
        windowSize: 5,
        missing: [],
      };

      expect(synAck({ ack: "100" }, state)).toBe(true);
      expect(synAck({ ack: "100" }, state)).toBe(false);
      synAck({ ack: "100" }, state);

      synAck({ ack: "100" }, state);
      synAck({ ack: "101" }, state);
      synAck({ ack: "101" }, state);
      synAck({ ack: "101" }, state);
      synAck({ ack: "102" }, state);
      synAck({ ack: "103" }, state);
      expect(state.minAck).toBe("103");
      expect(state.maxAck).toBe("103");

      synAck({ ack: "105" }, state);
      synAck({ ack: "105" }, state);
      synAck({ ack: "106" }, state);
      expect(state.minAck).toBe("103");
      expect(state.maxAck).toBe("106");

      expect(() =>
        synAck({ ack: "116" }, state)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Missing 19 messages between 103 and 116"`
      );
    });
  });
});
async function debugConverastion(client: Client, threadId: ThreadID) {
  return (await client.decryptThread(threadId)).map((m) => {
    return `[${m.type}] ${m.from.split("_")[0]}: ${m.message}`;
  });
}

test("incMessageId", async () => {
  const messageId = "9999999";
  expect(incMessageId(messageId)).toBe("999999a");
  expect(incMessageId(Number(99).toString(16))).toBe("64");
  expect(parseInt("9999999", 16)).toMatchInlineSnapshot(`161061273`);
  expect(parseInt("999999a", 16)).toMatchInlineSnapshot(`161061274`);
});
