/* eslint-disable @typescript-eslint/no-explicit-any */
import { editor, input, select, confirm } from "@inquirer/prompts";
import { Client } from "../client";
import { ThreadID } from "../client/GridStorage";
import { displayRawMessage } from "./mainClientMenu";
import { SignedTransport } from "../client/types";
import { ArrayBuffertohex } from "jsrsasign";

export async function viewEncryptedThread(client: Client, threadId: ThreadID) {
  const thread = await client.decryptThread(threadId);
  const threadInfo = await client.getThreadInfo(threadId);

  if (threadInfo.myRelay) {
    let json;
    try {
      console.log(`fetching updates from... ${threadInfo.myRelay}`);
      const response = await fetch(
        `${threadInfo.myRelay}/json?since=all&poll=1`,
      );
      const text = await response.text();

      await text
        .trim()
        .split("\n")
        .reduce(async (p, line) => {
          await p;
          json = JSON.parse(line);
          if (json?.message) {
            await client.appendThread(json.message, threadId).catch(() => {
              // Ignore errors about duplicate messages. This is expected.
            });
          }
        }, Promise.resolve());
    } catch (e) {
      console.error(e);
    }
  }

  console.log(
    `Thread: ${threadId}\n--------------------------------------------`,
  );
  thread.map((message) => {
    console.log(
      `${message.type} From: ${message.from} ${new Date(message.iat * 1000)}\n${
        message.message
      }\n--------------------------------------------`,
    );
  });

  const selection = await select({
    message: "What would you like to do?",
    choices: [
      threadInfo.myRelay ? { name: "Refresh", value: "refresh" } : null,
      { name: "Reply", value: "reply" },
      { name: "Reply (in $EDITOR)", value: "replyEditor" },
      { name: "Paste encrypted message", value: "paste" },
      { name: "View message details", value: "viewDetils" },
      {
        name: threadInfo.myRelay ? "Change Relay" : "Set Relay",
        value: "setRelay",
      },
      { name: "Back to main menu", value: "back" },
    ].filter((n) => n != null),
  });

  switch (selection) {
    case "back":
      return;
    case "setRelay": {
      let message =
        "Are you sure you want to remove your relay? The operation takes effect while sending a message";
      let newRelayUrl = "";
      if (!threadInfo.myRelay) {
        const topicArray = window.crypto.getRandomValues(new Uint8Array(16));
        newRelayUrl = `https://ntfy.sh/${ArrayBuffertohex(topicArray.buffer)}`;
        message = `Use ${newRelayUrl} to send future messages? The operation takes effect while sending a message`;
      }

      if (await confirm({ message })) {
        const selection = await select({
          message: "What would you like to do?",
          choices: [
            { name: "Reply", value: "reply" },
            { name: "Reply (in $EDITOR)", value: "replyEditor" },
            { name: "Back to main menu", value: "back" },
          ],
        });
        if (selection === "reply" || selection === "replyEditor") {
          await replyMenu(client, threadId, selection, {
            setMyRelay: newRelayUrl,
          });
        }
      }
      break;
    }
    case "replyEditor":
    case "reply": {
      await replyMenu(client, threadId, selection);
      break;
    }
    case "paste": {
      const message = await input({
        required: false,
        message:
          "Paste the encrypted reply you recieved (leave empty to cancel)",
      });
      if (message) {
        await client.appendThread(message as SignedTransport, threadId);
      }
      break;
    }
    case "viewDetils": {
      const index = await select({
        message: "Which message would you like to inspect?",
        choices: thread.map((message, index) => ({
          name: `From: ${message.from} ${new Date(message.iat * 1000)}\n${
            message.message
          }`,
          value: index,
        })),
      });

      if (index >= 0) {
        console.log(thread[index]);
        const encrypted = await client.getEncryptedThread(threadId);
        console.log(encrypted[index]);
      }
    }
  }

  return viewEncryptedThread(client, threadId);
}

async function replyMenu(
  client: Client,
  threadId: ThreadID,
  variant: "reply" | "replyEditor",
  options: { setMyRelay?: string } = {},
) {
  const prompt = variant === "reply" ? input : editor;
  const message = await prompt({
    required: false,
    message: "Enter your message. (leave empty to cancel)",
  });
  if (message) {
    const { reply, relay } = await client.replyToThread(threadId, message, {
      setMyRelay: options.setMyRelay,
    });
    await displayRawMessage(reply, relay);
  }
}
