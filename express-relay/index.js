const config = require("./config").default;
const logger = require("./logger").default;
const ExpressServer = require("./expressServer").default;

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
