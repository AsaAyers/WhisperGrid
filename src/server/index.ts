import { launchServer } from "./expressServer";
import logger from "./logger";

launchServer().catch((e) => logger.error(e));
