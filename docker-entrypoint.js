#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const { spawn } = require("node:child_process");
const fs = require("fs/promises");
const { config } = require("node:process");
const crypto = require("crypto");

const env = {
  ...process.env,
  SESSION_KEY_PATH: "/data/session.jwk",
  SECRET_PATH: "/data/secret.txt",
  SERVER_SECRET: "",
};

(async () => {
  if (fs.stat(env.SECRET_PATH).catch(() => false)) {
    env.SERVER_SECRET = crypto.randomBytes(64).toString("hex");
    fs.writeFile(env.SECRET_PATH, env.SERVER_SECRET, "utf-8");
  } else {
    config.SERVER_SECRET = await fs.readFile(env.SECRET_PATH, "utf-8");
  }

  // If running the web server then migrate existing database
  if (process.argv.slice(2).join(" ") === "npm run start") {
    await exec("npx prisma migrate deploy");
  }

  // launch application
  await exec(process.argv.slice(2).join(" "));
})();

function exec(command) {
  const child = spawn(command, { shell: true, stdio: "inherit", env });
  return new Promise((resolve, reject) => {
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} failed rc=${code}`));
      }
    });
  });
}
