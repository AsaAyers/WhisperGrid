/* eslint-disable @typescript-eslint/no-explicit-any */
import { password, rawlist, select } from "@inquirer/prompts";
import * as path from "path";
import { promises as fs } from "fs";
import { Client } from "../client";
import { GridStorage } from "../client/GridStorage";
import { SignedBackup } from "../client/types";
import crypto from "crypto";
import debounce from "lodash.debounce";
import { mainClientMenu } from "./mainClientMenu";

global.window ??= {} as any;
// @ts-expect-error The main target of the project is browsers, so it relies on window.crypto
window.crypto = crypto;

async function main() {
  const files = await fs.readdir(".");
  const jwsTxtFiles = files.filter((file) => file.endsWith(".jws.txt"));

  if (jwsTxtFiles.length > 0) {
    const filename = await rawlist({
      message: "Which file would you like to open?",
      choices: [
        ...jwsTxtFiles.map((file) => ({
          name: path.basename(file, ".jws.txt"),
          value: file,
        })),
        { value: "newIdentity", name: "Create a new identity" },
      ],
    });
    if (filename === "newIdentity") {
      return makeNewIdentity();
    }

    const pass = await password({
      message: "Enter pass phrase to decrypt file",
    });
    const backup = (await fs.readFile(filename, "utf-8")) as SignedBackup;
    try {
      const client = await Client.loadFromBackup(
        new GridStorage(),
        backup,
        pass
      );
      client.subscribe(
        debounce(async () => {
          const backup = await client.makeBackup(pass);
          await fs.writeFile(filename, backup);
        }, 500)
      );
      // eslint-disable-next-line no-constant-condition
      while (true) {
        await mainClientMenu(client);
      }
    } catch (e) {
      console.error("Error loading backup", e);
      process.exit(1);
    }
  } else {
    const newIdentity = await select({
      message:
        "No backup files found. Would you like to create a new identity?",
      choices: [
        { name: "Yes", value: "yes" },
        { name: "No", value: "no" },
      ],
    });

    if (newIdentity === "no") {
      process.exit(0);
    }
    return makeNewIdentity();
  }
}

async function makeNewIdentity() {
  let pass1 = "";
  for (let tries = 0; tries < 3; tries++) {
    pass1 = await password({
      message: "Enter pass phrase to encrypt your new identity",
    });
    const pass2 = await password({
      message: "Enter pass phrase again to confirm",
    });
    if (pass1 === pass2) {
      break;
    }
    console.error("Passwords do not match");
  }

  const client = await Client.generateClient(new GridStorage(), pass1);
  const filename = `grid-${client.thumbprint}.jws.txt`;
  client.subscribe(
    debounce(async () => {
      const backup = await client.makeBackup(pass1);
      await fs.writeFile(filename, backup);
    }, 500)
  );

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await mainClientMenu(client);
  }
}

main();
