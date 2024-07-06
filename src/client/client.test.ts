/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "./index";
import {
  deriveSharedSecret,
  exportKeyPair,
  importKeyPair,
  parseJWS,
} from "./utils";
import { generateECDHKeyPair } from "./utils";
import { StoredIdentity, TestStorage } from "./GridStorage";
import crypto from "crypto";

import { debuglog } from "util";
import { SignedBackup } from "./types";

const log = debuglog("whisper-grid:test:client");

global.window ??= {} as any;
// @ts-expect-error This is a hack to make this look more like the browser for testing
window.crypto = crypto;

const aliceIdentity: StoredIdentity = {
  id: {
    jwk: {
      key_ops: ["verify"],
      ext: true,
      kty: "EC",
      x: "zPRCzbz45S0Ss-Tor1KSgjouxRkpQcrmh3_7V6qHSv7bmH_s9cgDRYIT9NpHHYm6",
      y: "oWDGHCVEVwGAhHYVxHh83qzeS4o6PGcy6SViepmurDBhyH-BxmOno2uRRR3wDP4p",
      crv: "P-384",
    },
    private:
      "QL23nDpJUq+9+HR4Gd5i4o998rxpa7agXwJGh3U/2Bv/UmLnLE/8pchj3FjbjVSNj+ehiOWrhGJ44qwIgPNRh10TcpOXi3eCdaujZfkqDhS7aGVl3vnP5eoa83bx6jqF67FJfQQMjDJnX+Nh3ABnIgGWSGT5s/rCRO45i3txLu7p6uZmhGwinkd6qPVGEyL6fAsj4WiRdg4Il/i8f88uQxKzzsUEQ6xMhf3SU5T+S1Vuvb/uliLsym+iEobZee+Q7RIrEWqErsyBaC786tgcaLrw3xBxF4T93e/3bgEYyEXCWlLClkjprIQU/LVFpu1VSDRFvBtm7d2HZ3S+Cjhs5KK9CIaNsVDv/tIT9eDgy9cC0FSXWE1ej5VsgSm+.xNjIT21Xvxfa2ZoS.xQ9JMNYXm3LJUTvV1VabUw==",
  },
  storage: {
    jwk: {
      key_ops: [],
      ext: true,
      kty: "EC",
      x: "Budxp0C-gpccv8c4FtYA4H6Ir46-8sh1zBP_FUciqP0bV8LmJe5Keb3iLYxC8w-W",
      y: "dwrTD0KSV3pHUVWjGEb8M-GOBn54eKR3wJflKjpgjptSZiCuhVRz0umk9TBvdJI2",
      crv: "P-384",
    },
    private:
      "edfoyVlSgteEvufG6SSlyNqnYKY5pQpF0uwMv/LcHEVSE9jzMAxG4nPSEv5NjW30c0ImgSJfZ4uCERQbQrpHt7SR5VrM+XI8nlV84L7X2r40Z9LtLgtQbq7nYHAF5B+oIfTurGkQKFHGhbTpkH8YBl/jgRsG3m9zIVlMovyE9TOft/+n3p5QAZPgAv3J0tkHPv6VffgatRHm2A1qXySA3U9RUcGV9pJ+dPRUhS5jkJdejBrq/hq2iWbtVx33Oa289Hq7Bydh5xGB9Ff+yxdJJ7RC1LDYWgs4x+E+DVaobTdbi1Du6Kal5DcICe7UVIvuoag3YK5GKOuj4a+BonmXuU0mibglnhuHDrywe72GnW6DRxJu9B164rTRJ8puDop8tpN6OGKIHyleJgj8H7IW.yYXD4pj1WrJGf1UM.MTySWCk90QC5joIZNRpoYA==",
  },
} as any;

const aliceBackup: SignedBackup =
  "eyJhbGciOiJFUzM4NCIsImp3ayI6eyJrZXlfb3BzIjpbInZlcmlmeSJdLCJleHQiOnRydWUsImt0eSI6IkVDIiwieCI6InpQUkN6Yno0NVMwU3MtVG9yMUtTZ2pvdXhSa3BRY3JtaDNfN1Y2cUhTdjdibUhfczljZ0RSWUlUOU5wSEhZbTYiLCJ5Ijoib1dER0hDVkVWd0dBaEhZVnhIaDgzcXplUzRvNlBHY3k2U1ZpZXBtdXJEQmh5SC1CeG1Pbm8ydVJSUjN3RFA0cCIsImNydiI6IlAtMzg0In19.eyJ0aHVtYnByaW50IjoiaWQtcE1qMkhtVzAxYnViNC1zMFhVdUl5Qi1SRWNBYUk3czdvSWhwQmxEejZoQSIsImVuY3J5cHRlZElkZW50aXR5IjoiR2F6dmozR1lvNHFtY1doaUREVFRydTNZeTdvM2piRWpTZk9yUGlnRjZ3Uy9NSzNJUEFCbSt5VkVQUjBJSlJrcXJTaFZvRzkvUCthbFNTaGpHWmVvZWtFQUhMUjZxTHNkdHlZcE1Ed2xsbmF4ZjI4a0xFYld3cyt3aS9hOVJSQ0ErUWRXR3hwcVl6RmlISGNvWGJuNy90VHFmVFhKNnhtcUVLZTlra0g2T0RWM2x1UVlqWGxEbU85dlJ0d2VzbkorVFhvQ0w3bVJhd1Bzb1BWUDUxaGd3UXljOERsRXF0ZXdTcUtCT1hSckdsMG9YQSt3NEQ5Z01tcytIR2hJQkRhSlAwMEFRUmtrWEdOeE9JMGpITmtZbUlFMFhPaDhJa1FLR1Y2Q1F4aHZKWklEWTFMdFg3Wjd1V3lFT2xUZDBtRG5tRjJwV056WDR6NnExUHRrbGVDSXorcDQxQ2tjZkNXZ2hOQWdoeXF1VHg0OEk2QUxzWHp1cjBibXJuUVcub01haWtBL3lOWllwOHoyQi45KzkwWmRBVW9KTVQ0Wi9FcWI0ZjZ3PT0iLCJpZEpXSyI6eyJrZXlfb3BzIjpbInZlcmlmeSJdLCJleHQiOnRydWUsImt0eSI6IkVDIiwieCI6InpQUkN6Yno0NVMwU3MtVG9yMUtTZ2pvdXhSa3BRY3JtaDNfN1Y2cUhTdjdibUhfczljZ0RSWUlUOU5wSEhZbTYiLCJ5Ijoib1dER0hDVkVWd0dBaEhZVnhIaDgzcXplUzRvNlBHY3k2U1ZpZXBtdXJEQmh5SC1CeG1Pbm8ydVJSUjN3RFA0cCIsImNydiI6IlAtMzg0In0sImVuY3J5cHRlZFN0b3JhZ2VLZXkiOiJsYUZSRXhwQm5mWFIzK0psTVNCZG02NDhvQzZQMk51eVJWWXA2YlV5ZFFTdUVQT2tvdXZnV2NhbXdGYTd6eFI4NHo4Qmp5a2VreUk2aXNHWFh5STE1MWR6aE9QT3VMVVh2MHpGcEh4elZRWmRxNm5yZGFOS2V0NVUrT1FROVhVdjFSK2E0bWFJeWxyQ1IzOVYyMkdLbFZRU0w2V2dtNmdEc0tBejJEZDBuaERGQjhVWjVwUUdHWDVWbmdmaS85b1oreVZDYlhUUjdvK1d1YTJGdzZDVENDeCtWdUtMdmlZS1hSdGkwUVRpQS9tN1lHMEhMY1BuY1BiM0pmd3JaNFRWT1F0K3hIOU5qUUNlSXF1U3I3SElZL1VyUEQxN3ZYeGxWNkxaKy9adzN1ODM2K3I0bk9XK0ZPVm82MHlyOXkzRXZKc1ZzMHJ2QU1kQ1FrMEQvem5yeWhBSVFMTWFrRHlaUEh6MzdVUWI3NC9adVoyZ001Uk85QzNlS0toQkplZDMydGErYjJyc2RuNThmYjlFODZLUy5PN2gyRHZEakdWOFJGRlhQLlh6OWg3a1pabTVpTFh5Wnd2OTVPeWc9PSIsInN0b3JhZ2VKV0siOnsia2V5X29wcyI6W10sImV4dCI6dHJ1ZSwia3R5IjoiRUMiLCJ4IjoiQnVkeHAwQy1ncGNjdjhjNEZ0WUE0SDZJcjQ2LThzaDF6QlBfRlVjaXFQMGJWOExtSmU1S2ViM2lMWXhDOHctVyIsInkiOiJkd3JURDBLU1YzcEhVVldqR0ViOE0tR09CbjU0ZUtSM3dKZmxLanBnanB0U1ppQ3VoVlJ6MHVtazlUQnZkSkkyIiwiY3J2IjoiUC0zODQifSwidGhyZWFkcyI6e319.fV10_9dsQqRjoe-zGJiTosrWTigtIondYyLKbakCEJtcFu6ZMlNRl4d9CmdL01OK1BsKYP9h5LDhfxaZgsrTll0N5cHJyRFq3NJEPDmcVqIkk1yzpvMbQuigMESVV6oN" as SignedBackup;
const aliceThumbprint = "id-pMj2HmW01bub4-s0XUuIyB-REcAaI7s7oIhpBlDz6hA";

describe("Client", () => {
  test("createInvitation", async () => {
    const storage = new TestStorage();
    // storage.setItem(`identity:${aliceThumbprint}`, aliceIdentity);
    // const Alice = await Client.generateClient(storage, "Al1c3P@ssw0rd");
    const Alice = await Client.loadFromBackup(
      storage,
      aliceBackup,
      "Al1c3P@ssw0rd"
    );
    Alice.setClientNickname("Alice");

    const invitation = await Alice.createInvitation({
      nickname: "Alice",
      note: "Hello Bob, this first message is public.",
    });
    log("invitation", invitation);

    const { [`identity:${aliceThumbprint}`]: identity } = storage.getData();

    expect(JSON.stringify(identity)).toMatchInlineSnapshot(
      `"{"id":{"jwk":{"key_ops":["verify"],"ext":true,"kty":"EC","x":"zPRCzbz45S0Ss-Tor1KSgjouxRkpQcrmh3_7V6qHSv7bmH_s9cgDRYIT9NpHHYm6","y":"oWDGHCVEVwGAhHYVxHh83qzeS4o6PGcy6SViepmurDBhyH-BxmOno2uRRR3wDP4p","crv":"P-384"},"private":"Gazvj3GYo4qmcWhiDDTTru3Yy7o3jbEjSfOrPigF6wS/MK3IPABm+yVEPR0IJRkqrShVoG9/P+alSShjGZeoekEAHLR6qLsdtyYpMDwllnaxf28kLEbWws+wi/a9RRCA+QdWGxpqYzFiHHcoXbn7/tTqfTXJ6xmqEKe9kkH6ODV3luQYjXlDmO9vRtwesnJ+TXoCL7mRawPsoPVP51hgwQyc8DlEqtewSqKBOXRrGl0oXA+w4D9gMms+HGhIBDaJP00AQRkkXGNxOI0jHNkYmIE0XOh8IkQKGV6CQxhvJZIDY1LtX7Z7uWyEOlTd0mDnmF2pWNzX4z6q1PtkleCIz+p41CkcfCWghNAghyquTx48I6ALsXzur0bmrnQW.oMaikA/yNZYp8z2B.9+90ZdAUoJMT4Z/Eqb4f6w=="},"storage":{"jwk":{"key_ops":[],"ext":true,"kty":"EC","x":"Budxp0C-gpccv8c4FtYA4H6Ir46-8sh1zBP_FUciqP0bV8LmJe5Keb3iLYxC8w-W","y":"dwrTD0KSV3pHUVWjGEb8M-GOBn54eKR3wJflKjpgjptSZiCuhVRz0umk9TBvdJI2","crv":"P-384"},"private":"laFRExpBnfXR3+JlMSBdm648oC6P2NuyRVYp6bUydQSuEPOkouvgWcamwFa7zxR84z8BjykekyI6isGXXyI151dzhOPOuLUXv0zFpHxzVQZdq6nrdaNKet5U+OQQ9XUv1R+a4maIylrCR39V22GKlVQSL6Wgm6gDsKAz2Dd0nhDFB8UZ5pQGGX5Vngfi/9oZ+yVCbXTR7o+Wua2Fw6CTCCx+VuKLviYKXRti0QTiA/m7YG0HLcPncPb3JfwrZ4TVOQt+xH9NjQCeIquSr7HIY/UrPD17vXxlV6LZ+/Zw3u836+r4nOW+FOVo60yr9y3EvJsVs0rvAMdCQk0D/znryhAIQLMakDyZPHz37UQb74/ZuZ2gM5RO9C3eKKhBJed32ta+b2rsdn58fb9E86KS.O7h2DvDjGV8RFFXP.Xz9h7kZZm5iLXyZwv95Oyg=="}}"`
    );
  });

  test("bad password", async () => {
    const storage = new TestStorage();
    storage.setItem(`identity:${aliceThumbprint}`, aliceIdentity);

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
    const Alice = await Client.generateClient(
      new TestStorage(),
      "AliceP@ssw0rd"
    );
    Alice.setClientNickname("Alice");
    const Bob = await Client.generateClient(new TestStorage(), "B0bP@ssw0rd");
    Bob.setClientNickname("Bob");

    const invitation = await Alice.createInvitation({
      nickname: "Alice",
      note: "Hello Bob, this first message is not encrypted, but is signed",
    });
    const toAlice = await Bob.replyToInvitation(
      invitation,
      "Hello Alice, this is my first message to you",
      "Bob"
    );
    const aliceView = await Alice.appendThread(toAlice);
    expect(aliceView.message.message).toMatchInlineSnapshot(
      `"Hello Alice, this is my first message to you"`
    );

    const toBob = await Alice.replyToThread(
      aliceView.threadId,
      "Hello Bob, this is my reply to you"
    );

    const bobView = await Bob.appendThread(toBob);
    expect(bobView.message.message).toMatchInlineSnapshot(
      `"Hello Bob, this is my reply to you"`
    );

    const toAlice2 = await Bob.replyToThread(
      bobView.threadId,
      "Hello Alice, this is my second message to you"
    );
    const aliceView2 = await Alice.appendThread(toAlice2);
    expect(aliceView2.message.message).toMatchInlineSnapshot(
      `"Hello Alice, this is my second message to you"`
    );
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
    let alice = await Client.generateClient(new TestStorage(), "AlicePassword");
    alice.setClientNickname("Alice");
    const invitation = await alice.createInvitation({
      nickname: "Alice",
      note: "Hello Bob, this first message is public.",
    });
    await alice.replyToInvitation(invitation, "Hello Alice", "Bob");

    const invitations = alice.getInvitations();
    const encryptedThreads = Object.fromEntries(
      alice.getThreads().map((id) => [id, alice.getEncryptedThread(id)])
    );

    const backup = await alice.makeBackup("BackupPassword");
    const jws = await parseJWS(backup);
    alice = await Client.loadFromBackup(
      new TestStorage(),
      jws.payload,
      "BackupPassword"
    );

    expect(alice.getInvitations()).toEqual(invitations);

    expect(
      Object.fromEntries(
        alice.getThreads().map((id) => [id, alice.getEncryptedThread(id)])
      )
    ).toMatchObject(encryptedThreads);
  });
});
