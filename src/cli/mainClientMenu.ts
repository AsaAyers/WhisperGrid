/* eslint-disable @typescript-eslint/no-explicit-any */
import { input, rawlist, confirm } from "@inquirer/prompts";
import { Client, Thumbprint } from "../client";
import { ThreadID } from "../client/GridStorage";
import { SignedInvitation, SignedTransport } from "../client/types";
import { viewEncryptedThread } from "./viewEncryptedThread";
import { verifyJWS, parseJWSSync, getJWKthumbprint } from "../client/utils";
import { ArrayBuffertohex } from "jsrsasign";

export async function mainClientMenu(client: Client) {
  const invitations = client.getInvitationIds();
  const threads = client.getThreads();

  type Selection =
    | "exit"
    | "createInvitation"
    | "replyToInvitation"
    | ThreadID
    | Thumbprint<"ECDH">;
  console.clear();
  const selection = await rawlist<Selection>({
    message: "What would you like to do?",
    choices: [
      { name: "Create Invitation", value: "createInvitation" },
      ...invitations.map((value) => ({
        name: `View Invitation: ${value}`,
        value: value,
      })),
      { name: "Reply to Invitation", value: "replyToInvitation" },
      ...threads.map((value) => ({
        name: `View Thread: ${value}`,
        value: value,
      })),
      {
        name: "Exit",
        value: "exit",
      },
    ],
  });

  if (selection === "exit") {
    process.exit(0);
  } else if (selection === "createInvitation") {
    await createInvitationMenu(client);
  } else if (selection === "replyToInvitation") {
    await replyToInvitationMenu(client);
  }

  if (threads.includes(selection as ThreadID)) {
    await viewEncryptedThread(client, selection as ThreadID);
  }
  if (invitations.includes(selection as Thumbprint<"ECDH">)) {
    const invitation = client.getInvitation(selection as Thumbprint<"ECDH">);
    console.log(invitation);
    const reply = await input({
      required: false,
      message:
        "If you have received a reply, paste it here, or leave this empty to continue to the main menu",
    });
    if (reply) {
      const { threadId } = await client.appendThread(reply as SignedTransport);
      await viewEncryptedThread(client, threadId);
    }
  }
}

async function createInvitationMenu(client: Client) {
  const nickname = await input({
    message: "What would you like your nickname to be in this conversation?",
  });
  const note = await input({
    required: false,
    message: "(optional) Note to include with the invitation",
  });

  const invite = await client.createInvitation({ note, nickname });

  console.log(
    `Invitation created. Share the text below to allow friends to encrypt messages to you.`
  );
  console.log(invite);
  console.log("\n\n\n");
}

async function replyToInvitationMenu(client: Client) {
  const invite = await input({
    message: "Paste the invitation here",
  });
  if (!invite) return;
  const isValid = await verifyJWS(invite);
  if (!isValid) {
    console.log("Invalid invite");
    return;
  }

  const jws = parseJWSSync(invite as SignedInvitation);
  const thumbprint = await getJWKthumbprint(jws.payload.epk);

  console.log(`Invitation Thumbprint: ${thumbprint}`);
  console.log(`Nickname: ${jws.payload.nickname}`);
  console.log(`Note: ${jws.payload.note}`);

  const nickname = await input({
    message: "What would you like your nickname to be in this conversation?",
    required: true,
  });
  let setMyRelay = undefined;
  const topicArray = window.crypto.getRandomValues(new Uint8Array(16));
  const newRelayUrl = `https://ntfy.sh/${ArrayBuffertohex(topicArray.buffer)}`;
  const message = `Use ${newRelayUrl} to send future messages?`;
  if (await confirm({ message })) {
    setMyRelay = newRelayUrl;
  }

  const reply = await input({
    required: false,
    message: "Enter your reply, or leave empty to cancel",
  });
  if (reply) {
    const {
      threadId,
      reply: message,
      relay,
    } = await client.replyToInvitation(
      invite as SignedInvitation,
      reply,
      nickname,
      { setMyRelay }
    );
    await displayRawMessage(message, relay);
    return viewEncryptedThread(client, threadId);
  }
}
export async function displayRawMessage(message: string, relay?: string) {
  console.log(`Here is the message for you to send to the recipient`);
  console.log(message);

  if (!relay) {
    await confirm({ message: "Press enter to continue" });
  } else {
    const sendToRelay = await confirm({
      message: `Send message to relay? ${relay}`,
    });
    if (sendToRelay) {
      await fetch(relay, {
        method: "POST",
        body: message,
      }).catch(console.error);
    }
  }
}
