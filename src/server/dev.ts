/* eslint-disable @typescript-eslint/no-unused-vars */
import Parcel from "@parcel/core";
import path from "path";
import logger from "./logger";
import { launchServer } from "./expressServer";
import config from "./config";

export const launchBundler = async (port: number) => {
  const bundler = new Parcel({
    entries: path.join(__dirname, "../index.html"),
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
      console.log(
        `✨ Built ${bundles.length} bundles in ${event.buildTime}ms!`,
      );
    } else if (event?.type === "buildFailure") {
      console.log(event.diagnostics);
    }
  });
};

Promise.all([
  launchBundler(config.URL_PORT),
  launchServer(config.URL_PORT + 10),
]).catch((e) => logger.error(e));
