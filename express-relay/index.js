const config = require("./config").default;
const logger = require("./logger").default;
const ExpressServer = require("./expressServer").default;

const path = require("path");
// const defaultConfigContents = require("@parcel/config-default").default;
const Parcel = require("@parcel/core").default;

(async () => {
  let bundler = new Parcel({
    entries: path.join(__dirname, "../index.html"),
    // targets: ["WhisperGrid"],
    env: {
      NODE_ENV: "development",
    },
    additionalReporters: [
      {
        packageName: "@parcel/reporter-cli",
        resolveFrom: __dirname,
      },
    ],
    serveOptions: {
      port: 9010,
      publicUrl: "/WhisperGrid",
    },
    hmrOptions: {
      port: 9020,
    },

    defaultTargetOptions: {
      shouldOptimize: false,
      publicUrl: "/WhisperGrid",
    },
    defaultConfig: "@parcel/config-default",
    defaultEngines: {
      browsers: ["last 1 Chrome version"],
      node: "10",
    },
  });

  await bundler.watch((err, event) => {
    if (err) {
      // fatal error
      throw err;
    }

    if (event.type === "buildSuccess") {
      let bundles = event.bundleGraph.getBundles();
      console.log(
        `✨ Built ${bundles.length} bundles in ${event.buildTime}ms!`,
      );
    } else if (event.type === "buildFailure") {
      console.log(event.diagnostics);
    }
  });
})();

const launchServer = async () => {
  try {
    this.expressServer = new ExpressServer(
      config.URL_PORT,
      config.OPENAPI_YAML,
    );
    this.expressServer.launch();
    logger.info("Express server running");
  } catch (error) {
    console.error(error);
    logger.error("Express Server failure", error.message);
    await this.close();
  }
};

launchServer().catch((e) => logger.error(e));
