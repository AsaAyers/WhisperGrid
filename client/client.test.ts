import { Client } from ".";
import { deriveSharedSecret, exportKeyPair, importKeyPair } from "./utils";
import { generateECDHKeyPair } from "./utils";
import { TestStorage } from "./GridStorage";
import crypto from "crypto";

import { debuglog } from "util";
import { SignedInvitation } from "./types";

const log = debuglog("whisper-grid:test:client");

global.window ??= {} as any;
// @ts-expect-error
window.crypto = crypto;

const aliceIdentity = {
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
};
const aliceThumbprint =
  "whisper-grid://pMj2HmW01bub4-s0XUuIyB-REcAaI7s7oIhpBlDz6hA";

describe("Client", () => {
  test("createInvitation", async () => {
    const storage = new TestStorage();
    storage.setItem(`identity:${aliceThumbprint}`, aliceIdentity);
    // const Alice = await Client.generateClient(storage, "Al1c3P@ssw0rd");
    const Alice = await Client.loadClient(
      storage,
      aliceThumbprint,
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
      `"{"id":{"jwk":{"key_ops":["verify"],"ext":true,"kty":"EC","x":"zPRCzbz45S0Ss-Tor1KSgjouxRkpQcrmh3_7V6qHSv7bmH_s9cgDRYIT9NpHHYm6","y":"oWDGHCVEVwGAhHYVxHh83qzeS4o6PGcy6SViepmurDBhyH-BxmOno2uRRR3wDP4p","crv":"P-384"},"private":"QL23nDpJUq+9+HR4Gd5i4o998rxpa7agXwJGh3U/2Bv/UmLnLE/8pchj3FjbjVSNj+ehiOWrhGJ44qwIgPNRh10TcpOXi3eCdaujZfkqDhS7aGVl3vnP5eoa83bx6jqF67FJfQQMjDJnX+Nh3ABnIgGWSGT5s/rCRO45i3txLu7p6uZmhGwinkd6qPVGEyL6fAsj4WiRdg4Il/i8f88uQxKzzsUEQ6xMhf3SU5T+S1Vuvb/uliLsym+iEobZee+Q7RIrEWqErsyBaC786tgcaLrw3xBxF4T93e/3bgEYyEXCWlLClkjprIQU/LVFpu1VSDRFvBtm7d2HZ3S+Cjhs5KK9CIaNsVDv/tIT9eDgy9cC0FSXWE1ej5VsgSm+.xNjIT21Xvxfa2ZoS.xQ9JMNYXm3LJUTvV1VabUw=="},"storage":{"jwk":{"key_ops":[],"ext":true,"kty":"EC","x":"Budxp0C-gpccv8c4FtYA4H6Ir46-8sh1zBP_FUciqP0bV8LmJe5Keb3iLYxC8w-W","y":"dwrTD0KSV3pHUVWjGEb8M-GOBn54eKR3wJflKjpgjptSZiCuhVRz0umk9TBvdJI2","crv":"P-384"},"private":"edfoyVlSgteEvufG6SSlyNqnYKY5pQpF0uwMv/LcHEVSE9jzMAxG4nPSEv5NjW30c0ImgSJfZ4uCERQbQrpHt7SR5VrM+XI8nlV84L7X2r40Z9LtLgtQbq7nYHAF5B+oIfTurGkQKFHGhbTpkH8YBl/jgRsG3m9zIVlMovyE9TOft/+n3p5QAZPgAv3J0tkHPv6VffgatRHm2A1qXySA3U9RUcGV9pJ+dPRUhS5jkJdejBrq/hq2iWbtVx33Oa289Hq7Bydh5xGB9Ff+yxdJJ7RC1LDYWgs4x+E+DVaobTdbi1Du6Kal5DcICe7UVIvuoag3YK5GKOuj4a+BonmXuU0mibglnhuHDrywe72GnW6DRxJu9B164rTRJ8puDop8tpN6OGKIHyleJgj8H7IW.yYXD4pj1WrJGf1UM.MTySWCk90QC5joIZNRpoYA=="}}"`
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
      "Hello Alice, this is my first message to you"
    );
    const aliceView = await Alice.appendThread(toAlice);
    expect(aliceView.message).toMatchInlineSnapshot(
      `"Hello Alice, this is my first message to you"`
    );

    const toBob = await Alice.replyToThread(
      aliceView.threadThumbprint,
      "Hello Bob, this is my reply to you"
    );

    const bobView = await Bob.appendThread(toBob);
    expect(bobView.message).toMatchInlineSnapshot(
      `"Hello Bob, this is my reply to you"`
    );

    const toAlice2 = await Bob.replyToThread(
      bobView.threadThumbprint,
      "Hello Alice, this is my second message to you"
    );
    const aliceView2 = await Alice.appendThread(toAlice2);
    expect(aliceView2.message).toMatchInlineSnapshot(
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
});
