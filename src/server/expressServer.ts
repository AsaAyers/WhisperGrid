import http from "http";
import fs from "fs";
import path from "path";
import swaggerUI from "swagger-ui-express";
import jsYaml from "js-yaml";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import cookieSession from "cookie-session";
import bodyParser from "body-parser";
import { middleware } from "express-openapi-validator";
import logger from "./logger";
import config from "./config";
import morgan from "morgan";
import { invariant } from "../whispergrid/utils";

class ExpressServer {
  port: any;
  app: ReturnType<typeof express>;
  openApiPath: any;
  schema: any;
  server:
    | http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
    | undefined;
  constructor(port: number, openApiYaml: string) {
    this.port = port;
    this.app = express();
    this.openApiPath = openApiYaml;
    try {
      this.schema = jsYaml.safeLoad(fs.readFileSync(openApiYaml).toString());
    } catch (e: any) {
      logger.error("failed to start Express Server", e.message);
      console.error(e);
    }
    this.setupMiddleware();
  }

  setupMiddleware() {
    // this.setupAllowedMedia();
    this.app.use(
      morgan("combined", {
        // immediate: true,
      }),
    );

    this.app.use(cors());
    this.app.use(bodyParser.json({ limit: "14MB" }));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(cookieParser([config.SERVER_SECRET]));
    this.app.use(
      cookieSession({
        name: "session",
        keys: [config.SERVER_SECRET],
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      }),
    );

    this.app.get("/", (req, res) => {
      res.redirect("/WhisperGrid");
    });
    let dist = __dirname;
    while (dist && !fs.existsSync(path.join(dist, "dist"))) {
      dist = path.dirname(dist);
    }
    dist = path.join(dist, "dist/pwa");
    console.log({ dist });
    invariant(fs.existsSync(dist), "dist folder not found");

    this.app.use("/WhisperGrid", express.static(dist));
    this.app.all("/WhisperGrid/*", (req, res) => {
      if (path.extname(req.path) === "") {
        res.sendFile(path.join(dist, "index.html"));
      } else {
        res.sendStatus(404);
      }
    });
    this.app.get("/openapi", (req, res) =>
      res.sendFile(path.join(__dirname, "api", "openapi.yaml")),
    );

    this.app.use(
      "/api-docs",
      swaggerUI.serve,
      swaggerUI.setup(this.schema, {
        explorer: true,
        customSiteTitle: "WhisperGrid API",
      }),
    );
    this.app.get("/login-redirect", (req, res) => {
      res.status(200);
      res.json(req.query);
    });
    this.app.get("/oauth2-redirect.html", (req, res) => {
      res.status(200);
      res.json(req.query);
    });
    // @ts-expect-error IDK why this type is confused
    this.app.use(async (err, req, res, next) => {
      try {
        return next();
      } catch (e: any) {
        console.log(e);
        return res.status(500).json({ error: e.message });
      }
    });
    this.app.use(
      "/api",
      middleware({
        apiSpec: this.openApiPath,
        validateResponses: true,
        validateRequests: true,
        validateApiSpec: true,
        operationHandlers: path.join(__dirname, "routes"),
      }),
    );

    // @ts-expect-error unused variables
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    this.app.use((err, req, res, _next) => {
      // format error
      res.status(err.status || 500).json({
        message: err.message,
        errors: err.errors,
      });
    });
  }
  launch() {
    this.server = http.createServer(this.app).listen(this.port);
  }

  async close() {
    if (this.server !== undefined) {
      this.server.close();
      console.log(`Server on port ${this.port} shut down`);
    }
  }
}

export default ExpressServer;

export const launchServer = async (port = config.URL_PORT) => {
  try {
    const expressServer = new ExpressServer(port, config.OPENAPI_YAML);
    expressServer.launch();
    if (port === config.URL_PORT) {
      logger.info(`Express server running http://localhost:${port}`);
    }
  } catch (error: any) {
    console.error(error);
    logger.error("Express Server failure", error.message);
  }
};
