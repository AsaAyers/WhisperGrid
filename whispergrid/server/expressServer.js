"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchServer = void 0;
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cookie_session_1 = __importDefault(require("cookie-session"));
const body_parser_1 = __importDefault(require("body-parser"));
const express_openapi_validator_1 = require("express-openapi-validator");
const logger_1 = __importDefault(require("./logger"));
const config_1 = __importDefault(require("./config"));
const morgan_1 = __importDefault(require("morgan"));
class ExpressServer {
    port;
    app;
    openApiPath;
    schema;
    server;
    constructor(port, openApiYaml) {
        this.port = port;
        this.app = (0, express_1.default)();
        this.openApiPath = openApiYaml;
        try {
            this.schema = js_yaml_1.default.safeLoad(fs_1.default.readFileSync(openApiYaml).toString());
        }
        catch (e) {
            logger_1.default.error("failed to start Express Server", e.message);
            console.error(e);
        }
        this.setupMiddleware();
    }
    setupMiddleware() {
        // this.setupAllowedMedia();
        this.app.use((0, morgan_1.default)("combined", {
        // immediate: true,
        }));
        this.app.use((0, cors_1.default)());
        this.app.use(body_parser_1.default.json({ limit: "14MB" }));
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: false }));
        this.app.use((0, cookie_parser_1.default)([config_1.default.SERVER_SECRET]));
        this.app.use((0, cookie_session_1.default)({
            name: "session",
            keys: [config_1.default.SERVER_SECRET],
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        }));
        this.app.get("/", (req, res) => {
            res.redirect("/WhisperGrid");
        });
        if (this.port === config_1.default.URL_PORT) {
            const dist = path_1.default.join(__dirname, "../../");
            this.app.use("/WhisperGrid", express_1.default.static(dist));
            this.app.all("/WhisperGrid/*", (req, res) => {
                if (path_1.default.extname(req.path) === "") {
                    res.sendFile(path_1.default.join(dist, "index.html"));
                }
                else {
                    res.sendStatus(404);
                }
            });
        }
        this.app.get("/openapi", (req, res) => res.sendFile(path_1.default.join(__dirname, "api", "openapi.yaml")));
        this.app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(this.schema, {
            explorer: true,
            customSiteTitle: "WhisperGrid API",
        }));
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
            }
            catch (e) {
                console.log(e);
                return res.status(500).json({ error: e.message });
            }
        });
        this.app.use("/api", (0, express_openapi_validator_1.middleware)({
            apiSpec: this.openApiPath,
            validateResponses: true,
            validateRequests: true,
            validateApiSpec: true,
            operationHandlers: path_1.default.join(__dirname, "routes"),
        }));
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
        this.server = http_1.default.createServer(this.app).listen(this.port);
    }
    async close() {
        if (this.server !== undefined) {
            this.server.close();
            console.log(`Server on port ${this.port} shut down`);
        }
    }
}
exports.default = ExpressServer;
const launchServer = async (port = config_1.default.URL_PORT) => {
    try {
        const expressServer = new ExpressServer(port, config_1.default.OPENAPI_YAML);
        expressServer.launch();
        if (port === config_1.default.URL_PORT) {
            logger_1.default.info(`Express server running http://localhost:${port}`);
        }
    }
    catch (error) {
        console.error(error);
        logger_1.default.error("Express Server failure", error.message);
    }
};
exports.launchServer = launchServer;
