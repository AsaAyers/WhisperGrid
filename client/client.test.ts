import { Client } from ".";
import { TestStorage } from "./GridStorage";
import crypto from "crypto";
import { TaggedString } from "./types";

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

    storage.setItem(`PEM:${bobKey.fingerprint}`, bobKey.pem);
    const Bob = new Client(storage, bobKey.fingerprint, "Bob");

    const invitation = await Alice.createInvitation({ note: "Hello Bob" });
    console.log("invitation", invitation);

    const reply = Bob.replyToInvitation(invitation, "Hello Alice");
  });
});
