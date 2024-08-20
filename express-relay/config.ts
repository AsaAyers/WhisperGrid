import {
  decryptPrivateKey,
  encryptPrivateKey,
  exportKey,
  generateECDSAKeyPair,
  importPrivateKey,
  JWK,
  TaggedKey,
} from "../src/client/utils";

import crypto from "crypto";

const g = global as any;
g.window ??= {};
g.window.crypto ??= crypto;

const path = require("path");
const fs = require("fs");

const config = {
  ROOT_DIR: __dirname,
  URL_PORT: 9001,
  URL_PATH: "http://localhost:9001",
  BASE_VERSION: "",
  CONTROLLER_DIRECTORY: path.join(__dirname, "controllers"),
  PROJECT_DIR: __dirname,
  SERVER_SECRET: "e20467e2a49ae46d7501980f848554c4",

  OPENAPI_YAML: "",
  FULL_PATH: "",
  FILE_UPLOAD_PATH: "",
  sessionPrivateKey: Promise.resolve(
    null as any as TaggedKey<["ECDSA", "private"]>,
  ),
};
config.OPENAPI_YAML = path.join(config.ROOT_DIR, "api", "openapi.yaml");
config.FULL_PATH = `${config.URL_PATH}:${config.URL_PORT}/${config.BASE_VERSION}`;
config.FILE_UPLOAD_PATH = path.join(config.PROJECT_DIR, "uploaded_files");

async function loadSessionPrivateKey(): Promise<
  TaggedKey<["ECDSA", "private"]>
> {
  let jwk: JWK<"ECDSA", "private">;
  const filename = path.join(__dirname, "session.jwk");
  if (!fs.existsSync(filename)) {
    const keyPair = await generateECDSAKeyPair();
    jwk = await exportKey(keyPair.privateKey);
    const backup = await encryptPrivateKey(jwk, config.SERVER_SECRET);
    fs.writeFileSync(filename, backup);
  } else {
    const backup = fs.readFileSync(filename, "utf8");
    jwk = await decryptPrivateKey(backup, config.SERVER_SECRET);
  }
  return importPrivateKey("ECDSA", jwk);
}
config.sessionPrivateKey = loadSessionPrivateKey();
export default config;
