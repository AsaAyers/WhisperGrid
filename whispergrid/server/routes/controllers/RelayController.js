"use strict";
/**
 * The RelayController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */
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
exports.replyToInvite = exports.publishReply = exports.publishInvite = exports.getMyThreads = exports.getThread = exports.getInvite = void 0;
const Controller_1 = require("./Controller");
const service = __importStar(require("../services/RelayService"));
const getInvite = async (request, response) => {
    await Controller_1.Controller.handleRequest(request, response, service.getInvite);
};
exports.getInvite = getInvite;
const getThread = async (request, response) => {
    await Controller_1.Controller.handleRequest(request, response, service.getThread);
};
exports.getThread = getThread;
const getMyThreads = async (request, response) => {
    await Controller_1.Controller.handleRequest(request, response, service.getMyThreads);
};
exports.getMyThreads = getMyThreads;
const publishInvite = async (request, response) => {
    await Controller_1.Controller.handleRequest(request, response, service.publishInvite);
};
exports.publishInvite = publishInvite;
const publishReply = async (request, response) => {
    await Controller_1.Controller.handleRequest(request, response, service.publishReply);
};
exports.publishReply = publishReply;
const replyToInvite = async (request, response) => {
    await Controller_1.Controller.handleRequest(request, response, service.replyToInvite);
};
exports.replyToInvite = replyToInvite;
