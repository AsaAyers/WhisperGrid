import * as jose from "jose";
import { Client, deriveSharedSecret, generateECDHKeyPair } from ".";
import { TestStorage } from "./GridStorage";
import crypto from "crypto";
import { SignedInvitation, TaggedString } from "./types";
import { ArrayBuffertohex, KEYUTIL, hextoArrayBuffer } from "jsrsasign";

global.window ??= {} as any;
window.crypto = {
  // @ts-ignore
  subtle: crypto.webcrypto.subtle,
};

const bobKey = {
  fingerprint: "_TtG_X9lyuuKhMaJpFz7icghahc3_kA5JQvpN20C7h4",
  pem: `
-----BEGIN EC PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: DES-EDE3-CBC,19030EFF56189887

i1ZWGofMhccykJE+FMJf/lYf6aH2IijUjRAWFPPCZTUDKNuQeNUQ/bN14dcpVz11
FxKJ04T1YNfi0rCFwbI3pGCtc1ME999WjUhnE2qpyM5BXF7vEyrLLHKxhP7unLP/
z4AYZcxCAxriGRvKxB8TM7pjdO66XNTG3a5/n786Hw6/wXtfNmm6mySmWsMgGuEn
8edGBZ1eMBqzN3dCi5Ii0nfgfA88AGkM
-----END EC PRIVATE KEY-----
  ` as TaggedString<"PEM">,
};

describe("Client", () => {
  test("generateClient", async () => {
    const storage = new TestStorage();
    const Alice = Client.generateClient(storage, "Alice");
    const invitation = await Alice.createInvitation({ note: "Hello Bob" });
    // console.log("invitation", invitation);
  });

  test.only("replyToInvitation", async () => {
    const storage = new TestStorage();
    storage.setItem(`PEM:${bobKey.fingerprint}`, bobKey.pem);
    const Bob = new Client(storage, bobKey.fingerprint, "Bob");
    const invitation =
      "eyJhbGciOiJFUzM4NCIsImp3ayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMzg0IiwieCI6IlA5eTNDQng0R1M0TDRidHlzRVNzeENpb3h5eWxJSjl2WDJXRzlnQkZrWjlzVUg3c2k2REFrVnlOdWlUYkJ2d0QiLCJ5IjoiRXJPbXFIY0lvYWVpTjlNUWNQeVRZdjVLMkhKRW5MaVFkdmdRQmMzMi16aTVIaGpyWEZiRC1EMGV4OC1CZHltViJ9fQ.eyJtZXNzYWdlSWQiOjg5MDM4NDU1MTQwNzc2NzMsInRocmVhZEpXSyI6eyJrZXlfb3BzIjpbXSwiZXh0Ijp0cnVlLCJrdHkiOiJFQyIsIngiOiJYc0FVS3pWNEt6Mm5iNUpXaHl5cC10MS1nT3JqRTdGa3BuX3pQcUJpYWI1ZnQ4NmdKb1NGbXROaGJXVVIzWURmIiwieSI6IjN5dXllQ3oxTk9ZMkcySU1ncFVRLUw3cDhHTnFyOFcwcmlHN1haNlUzOGFPNlJZbTVkS3JsVUpodXV2ZWpzd2IiLCJjcnYiOiJQLTM4NCJ9LCJub3RlIjoiSGVsbG8gQm9iIn0.gSvmaXMsH3_A2hPZi-VOTXY52YUeambkpNCL5r2qPuMalZIqUlZK24j5YbmYIIb1ZRbAu6P6ZLS2tss6DGpKqZbWs4SMaKVVbzmCYY1XNwTq1WIJQicC2LhC_Wi6Y24J" as SignedInvitation;
    const reply = await Bob.replyToInvitation(invitation, "Hello Alice");
    console.log("reply", reply);
  }, 20000);

  test("deriveSharedSecret", async () => {
    const [a, b] = await Promise.all([
      generateECDHKeyPair(),
      generateECDHKeyPair(),
    ]);
    const secret = await deriveSharedSecret(a.privateKey, b.jwk);
    // console.log(ArrayBuffertohex(secret));
  });
});
