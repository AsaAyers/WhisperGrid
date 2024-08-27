"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchBundler = void 0;
/* eslint-disable @typescript-eslint/no-unused-vars */
const core_1 = __importDefault(require("@parcel/core"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("./logger"));
const expressServer_1 = require("./expressServer");
const config_1 = __importDefault(require("./config"));
const launchBundler = async (port) => {
    const bundler = new core_1.default({
        entries: path_1.default.join(__dirname, "../index.html"),
        env: {
            NODE_ENV: "development",
        },
        logLevel: "info",
        additionalReporters: [
            {
                packageName: "@parcel/reporter-cli",
                resolveFrom: __dirname,
            },
        ],
        serveOptions: {
            port,
            publicUrl: "/WhisperGrid",
            host: "0.0.0.0",
        },
        hmrOptions: {
            port: 9020,
            host: "0.0.0.0",
        },
        defaultTargetOptions: {
            shouldOptimize: false,
            publicUrl: "/WhisperGrid",
            sourceMaps: true,
        },
        defaultConfig: "@parcel/config-default",
    });
    await bundler.watch((err, event) => {
        if (err) {
            // fatal error
            throw err;
        }
        if (event?.type === "buildSuccess") {
            const bundles = event.bundleGraph.getBundles();
            console.log(`✨ Built ${bundles.length} bundles in ${event.buildTime}ms!`);
        }
        else if (event?.type === "buildFailure") {
            console.log(event.diagnostics);
        }
    });
};
exports.launchBundler = launchBundler;
Promise.all([
    (0, exports.launchBundler)(config_1.default.URL_PORT),
    (0, expressServer_1.launchServer)(config_1.default.URL_PORT + 10),
]).catch((e) => logger_1.default.error(e));
