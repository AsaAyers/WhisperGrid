"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../whispergrid/utils");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const g = global;
g.window ??= {};
g.window.crypto ??= crypto_1.default;
const config = {
    ROOT_DIR: __dirname,
    URL_PORT: 9001,
    URL_PATH: "http://localhost:9001",
    BASE_VERSION: "",
    CONTROLLER_DIRECTORY: path_1.default.join(__dirname, "controllers"),
    PROJECT_DIR: __dirname,
    SERVER_SECRET: "e20467e2a49ae46d7501980f848554c4",
    OPENAPI_YAML: "",
    FULL_PATH: "",
    FILE_UPLOAD_PATH: "",
    sessionPrivateKey: Promise.resolve(null),
};
config.OPENAPI_YAML = path_1.default.join(config.ROOT_DIR, "api", "openapi.yaml");
config.FULL_PATH = `${config.URL_PATH}:${config.URL_PORT}/${config.BASE_VERSION}`;
config.FILE_UPLOAD_PATH = path_1.default.join(config.PROJECT_DIR, "uploaded_files");
async function loadSessionPrivateKey() {
    let jwk;
    const filename = path_1.default.join(__dirname, "session.jwk");
    if (!fs_1.default.existsSync(filename)) {
        const keyPair = await (0, utils_1.generateECDSAKeyPair)();
        jwk = await (0, utils_1.exportKey)(keyPair.privateKey);
        const backup = await (0, utils_1.encryptPrivateKey)(jwk, config.SERVER_SECRET);
        fs_1.default.writeFileSync(filename, backup);
    }
    else {
        const backup = fs_1.default.readFileSync(filename, "utf8");
        jwk = await (0, utils_1.decryptPrivateKey)(backup, config.SERVER_SECRET);
    }
    return (0, utils_1.importPrivateKey)("ECDSA", jwk);
}
config.sessionPrivateKey = loadSessionPrivateKey();
exports.default = config;
