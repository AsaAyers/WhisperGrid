import { launchServer } from "./expressServer";
import logger from "./logger";

process.env.DATABASE_URL ??= "file:./whispergrid.db";

launchServer().catch((e) => logger.error(e));
