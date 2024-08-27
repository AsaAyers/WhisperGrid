"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const expressServer_1 = require("./expressServer");
const logger_1 = __importDefault(require("./logger"));
(0, expressServer_1.launchServer)().catch((e) => logger_1.default.error(e));
