"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBackup = exports.logoutUser = exports.loginWithChallenge = exports.getLoginChallenge = exports.getBackup = void 0;
const Controller_1 = require("./Controller");
const service = __importStar(require("../services/UserService"));
const getBackup = async (request, response) => {
    await Controller_1.Controller.handleRequest(request, response, service.getBackup);
};
exports.getBackup = getBackup;
const getLoginChallenge = async (request, response) => {
    // response.json(await makeLoginChallenge());
    await Controller_1.Controller.handleRequest(request, response, service.getLoginChallenge);
};
exports.getLoginChallenge = getLoginChallenge;
const loginWithChallenge = async (request, response) => {
    await Controller_1.Controller.handleRequest(request, response, service.loginWithChallenge, "loginRequest");
};
exports.loginWithChallenge = loginWithChallenge;
const logoutUser = async (request, response) => {
    await Controller_1.Controller.handleRequest(request, response, service.logoutUser);
};
exports.logoutUser = logoutUser;
const uploadBackup = async (request, response) => {
    await Controller_1.Controller.handleRequest(request, response, service.uploadBackup);
};
exports.uploadBackup = uploadBackup;
