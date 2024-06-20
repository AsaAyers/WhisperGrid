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
  "identity:cKVBkkGc4Y9AgUdH_A9bUR1pSfqcBw7JhTZaNOLdFWg": {
    id: {
      jwk: {
        key_ops: ["verify"],
        ext: true,
        kty: "EC",
        x: "LCEKGvPG0U21IUkFRmYa8NBiFfI_29W56zLTCkNZIZGTEUSDUhINKgsEbcm9qDMk",
        y: "pKBJ3BDUXFEaH8mUFvpY9fAN37R9Fp69NP0-H4m-Qk5jEa4plTa5FyZ8YDt4t-2o",
        crv: "P-384",
      },
      private:
        "FPEj18DW+kjgKdhRCtbSOmh7XCWRWNTiCFp8YGb2kg2J6A0bSEeLItZvaA3rwub7abhkSoSGcyFYDCbkfpPXO6vdQxLBhCZHNTsTcEhMaSvS/4LFWy/m5EXsX8tS/7IwxQ2AutdD4zBfpDssoRdkOzMcQQXZoufpeNsbyv+n8UePuJtnGR3fd0JObnStRAm4oSLh95QnrfNtAVg51NUZJ84AmhpMYtjVEnuq7stXgZcL6kuuRUk1/RU1g4PHqXfk8GF9Jy5MrpfAKudAXgWN859LdiJr5DQgb9JTOs+AJ8kz/1scFpQo7xrT2pGDGW6qDs2wp19sAbURNqe1tR3i3GET9PeXkp4e6pZWdPgtcz/1ynHTq9sezzyv13VH.BPM6GJXNBN2yCDPj.TRgas3CkhaXUXrF613IR4Q==",
    },
    storage: {
      jwk: {
        key_ops: [],
        ext: true,
        kty: "EC",
        x: "NaTHz7sJ2ZOS0oli-kM5GUKoLdUxP7cj-OCq4Pj5VEniFpsug1a7krG7vi-AdY8P",
        y: "oxG5h_ABmQtgINPPXM17SQDEmYm6_fArdanue2N-8_ELDyeITqk7_iyDAmNhNgr2",
        crv: "P-384",
      },
      private:
        "ICwdt8LSIi86BcCEf2liXftQuOmdo+k5KdBAfmWHmP/r/2KkT5WbauRxisnv7M2qSBUCUc2ih6/h1g+5zshcpMDoGMetMhyUgvfC5QpIYRfV6Ptu0f+IiHjZv2A6e3mU5oBnAC4oMYqxUKQy2w5qSjc82EhV/n7GoOEnE4gchGB0SF46OtsbRwQs/bbmemr9o+GBeNhf9Hoo7hTO7Bg8+XS51xul68juhDhMuyPcWcD4sKxohc0wD6q1CkufzfKUzkpos2mQn7WdQTNvfvoidhxdKN233YpXURR7Xc6q+HqAQPNvVJz2d2RSzSYQj0JNh59g7YXLY5iQmTQdN+53Ovpq0AfQq3F0yU87JHgmy7ApoREna3OCOSvNaM5DDcAcSkTTGEIYFe7AwRFtVc9M.CXNYqsoWgGQQ1BR8.ndboiKy4VC7Rs2YqwZXtJQ==",
    },
  },
};

describe("Client", () => {
  test("createInvitation", async () => {
    const storage = new TestStorage();
    const Alice = await Client.generateClient(storage, "Al1c3P@ssw0rd");
    // expect(JSON.stringify(storage.getData(), null, 2)).toMatchInlineSnapshot();

    const invitation = await Alice.createInvitation({
      nickname: "Alice",
      note: "Hello Bob, this first message is public.",
    });
    log("invitation", invitation);
  });

  const invitation =
    "eyJhbGciOiJFUzM4NCIsImp3ayI6eyJrZXlfb3BzIjpbInZlcmlmeSJdLCJleHQiOnRydWUsImt0eSI6IkVDIiwieCI6InRfSVF3MVRkYzRRMnJIU2MyUFJLVUVBTFk1RW5BdUVCbGhLcUIzTTJwTjlGbEQ3SHhSU01fN0NhX0x0VTU2VVQiLCJ5IjoidU9wQ1gzWkFfMG0zQS16LWluMmpXTlFhVGNYVnBfZHVfeTBzdjR0TXl4UW1lSkUxSkNtakN4ek1DR0pDel8xUSIsImNydiI6IlAtMzg0In19.eyJtZXNzYWdlSWQiOjc0MTcwOTEzNjgwNTg3NDcsInRocmVhZEpXSyI6eyJrZXlfb3BzIjpbXSwiZXh0Ijp0cnVlLCJrdHkiOiJFQyIsIngiOiIxWWFlS1RuQk9DdjRQQ3Y5NDlrTzlDTG1ZS0FCa1JmeU41em1oQkVwc1RkTW5zVzRuT2hrTXZzZFFINEtYSGw0IiwieSI6Ik4zNzhVaHkyNUZZWEpFX2E1bWtaa2FFTXQwalBSVndUcTRVTllIZEJVcE1NTkZSU0lQQ2RINmlrcUVSOVZTaVMiLCJjcnYiOiJQLTM4NCJ9LCJub3RlIjoiSGVsbG8gQm9iLCB0aGlzIGZpcnN0IG1lc3NhZ2UgaXMgcHVibGljLiIsIm5pY2tuYW1lIjoiQWxpY2UifQ.3FOza-D7Qnri-hB9c3KjJY1qymt3tHPhH6dT4IR1xx8fT3_wIzcNyC2Z1b8RjVuOHzX0sL-rFZK89D7ekPAO06KZlXzgcKPQli5fQa2u_tLMjwMSCxwDZFPkCib5qz0W" as SignedInvitation;

  test("replyToInvitation", async () => {
    const storage = new TestStorage();
    const Bob = await Client.generateClient(storage, "B0bP@ssw0rd");
    const reply = await Bob.replyToInvitation(invitation, "Hello Alice");
    console.log("reply", reply);
  }, 20000);

  // const reply =
  //   "eyJhbGciOiJIUzM4NCIsImVuYyI6IkEyNTZHQ00iLCJqd2siOnsia3R5IjoiRUMiLCJjcnYiOiJQLTM4NCIsIngiOiJuc1VYV2diRVR1UmZzQUlWQTZ5UnUxek41dVhQSm5Sa2M4VXNfT0Z5VDVoMllwRkQwcVRKN1E4bkhsejVQRGFDIiwieSI6IndwNXJmOGU1eVJRUTZtQUw0NGV1c0lCSTJCTWdreHRTTWlIUFZPajUzb1JUOXJkNGdMc2V0NlBodktZX0xEeW4ifX0=..W29iamVjdCBBcnJheUJ1ZmZlcl0";

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
