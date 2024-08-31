import {
  decryptPrivateKey,
  encryptPrivateKey,
  exportKey,
  generateECDSAKeyPair,
  importPrivateKey,
  JWK,
  TaggedKey,
} from "../whispergrid/utils";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { TaggedString } from "whispergrid/types";

const g = global as any;
g.window ??= {};
g.window.crypto ??= crypto;
const URL_PORT = Number(process.env.PORT || 3000);

const config = {
  ROOT_DIR: __dirname,
  URL_PORT,
  URL_PATH: `http://localhost:${URL_PORT}`,
  BASE_VERSION: "",
  CONTROLLER_DIRECTORY: path.join(__dirname, "controllers"),
  PROJECT_DIR: __dirname,
  SECRET_PATH: "./secret.txt",
  SERVER_SECRET:
    process.env.SERVER_SECRET || crypto.randomBytes(32).toString("hex"),
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
  let jwk: JWK<"ECDSA", "private"> | undefined = undefined;
  const filename =
    process.env.SESSION_KEY_PATH || path.join(__dirname, "session.jwk");
  console.log({ filename });

  if (!fs.existsSync(config.SECRET_PATH)) {
    fs.writeFileSync(
      config.SECRET_PATH,
      crypto.randomBytes(64).toString("hex"),
    );
  }
  config.SERVER_SECRET =
    process.env.SERVER_SECRET || fs.readFileSync(config.SECRET_PATH, "utf8");

  if (fs.existsSync(filename)) {
    const backup = fs.readFileSync(filename, "utf8") as TaggedString<
      ["ECDSA", "private"]
    >;
    try {
      jwk = await decryptPrivateKey(backup, config.SERVER_SECRET);
    } catch (e) {
      console.error("Error decrypting session key");
    }
  }

  if (!jwk) {
    console.warn("Generating new session key");
    const keyPair = await generateECDSAKeyPair();
    jwk = await exportKey(keyPair.privateKey);
    const backup = await encryptPrivateKey(jwk, config.SERVER_SECRET);
    fs.writeFileSync(filename, backup);
  }
  return importPrivateKey("ECDSA", jwk);
}
config.sessionPrivateKey = loadSessionPrivateKey();
export default config;
