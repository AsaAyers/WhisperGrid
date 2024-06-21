import { Client } from "./client";
import { TestStorage } from "./client/GridStorage";

async function main() {
  const Alice = await Client.generateClient(new TestStorage(), "AliceP@ssw0rd");
  Alice.setClientNickname("Alice");
  const Bob = await Client.generateClient(new TestStorage(), "B0bP@ssw0rd");
  Bob.setClientNickname("Bob");

  const invitation = await Alice.createInvitation({
    nickname: "Alice",
    note: "Hello Bob, this first message is not encrypted, but is signed",
  });

  console.log("invitation", invitation);
  const toAlice = await Bob.replyToInvitation(
    invitation,
    "Hello Alice, this is my first message to you"
  );
  console.log("toAlice", toAlice);
  const aliceView = await Alice.appendThread(toAlice);
  console.log(aliceView);

  const toBob = await Alice.replyToThread(
    aliceView.threadThumbprint,
    "Hello Bob, this is my reply to you"
  );
  console.log("toBob", toBob);

  const bobView = await Bob.appendThread(toBob);
  console.log(bobView);

  const toAlice2 = await Bob.replyToThread(
    bobView.threadThumbprint,
    "Hello Alice, this is my second message to you"
  );
  console.log("toAlice2", toAlice2);
  const aliceView2 = await Alice.appendThread(toAlice2);
  console.log(aliceView2);
}

console.log("main");
main();
