"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBackup = exports.logoutUser = exports.loginWithChallenge = exports.getLoginChallenge = exports.getBackup = exports.validateChallenge = exports.makeLoginChallenge = void 0;
const Service_1 = require("./Service");
const config_1 = __importDefault(require("../../config"));
const crypto_1 = __importDefault(require("crypto"));
const utils_1 = require("../../../whispergrid/utils");
const sessionKey = config_1.default.sessionPrivateKey;
const SIGN_TIME_LIMIT = 60;
const makeLoginChallenge = async (now = Math.floor(Date.now() / 1000)) => {
    const signature = Buffer.from(await crypto_1.default.subtle.digest("SHA-256", Buffer.from(`${config_1.default.SERVER_SECRET}${now}`))).toString("hex");
    return `${now}:${signature}`;
};
exports.makeLoginChallenge = makeLoginChallenge;
const validateChallenge = async (challenge) => {
    const [timestamp, signature] = challenge.split(":");
    const expected = await (await (0, exports.makeLoginChallenge)(Number(timestamp))).split(":")[1];
    if (signature !== expected) {
        throw new Error("Invalid challenge");
    }
    const unixTimetsamp = Math.floor(Date.now() / 1000);
    if (Number(timestamp) > unixTimetsamp) {
        throw new Error(`Challenges cannot be in the future`);
    }
    if (unixTimetsamp - Number(timestamp) > 600) {
        throw new Error(`Challenges expire after 10 minutes`);
    }
};
exports.validateChallenge = validateChallenge;
/**
 * Get password-protected backup by backupKey
 *
 *
 * backupKey String sha256(thumbprint+password)
 * returns String
 * */
const getBackup = async ({ backupKey }) => {
    try {
        return Service_1.Service.successResponse(backupKey);
    }
    catch (e) {
        throw Service_1.Service.rejectResponse(e.message || "Invalid input", e.status || 405);
    }
};
exports.getBackup = getBackup;
/**
 * Get a login challenge
 *
 *
 * returns String
 * */
const getLoginChallenge = async () => {
    try {
        return Service_1.Service.successResponse(await (0, exports.makeLoginChallenge)());
    }
    catch (e) {
        throw Service_1.Service.rejectResponse(e.message || "Invalid input", e.status || 405);
    }
};
exports.getLoginChallenge = getLoginChallenge;
/**
 * Login with a challenge
 *
 *
 * signedChallenge String JWS - { header: { iat, sub: 'challenge', jwk, }, payload: challenge }
 * returns String
 * */
const loginWithChallenge = async ({ loginRequest: { signedChallenge } }, request) => {
    try {
        if (!(await (0, utils_1.verifyJWS)(signedChallenge))) {
            throw Service_1.Service.rejectResponse("Invalid JWS", 400);
        }
        const { header, payload } = (0, utils_1.parseJWSSync)(signedChallenge);
        if (header.sub !== "challenge") {
            throw Service_1.Service.rejectResponse("Invalid JWS", 400);
        }
        const unixTimetsamp = Math.floor(Date.now() / 1000);
        if (!header.iat || unixTimetsamp - header.iat > SIGN_TIME_LIMIT) {
            throw Service_1.Service.rejectResponse(`Invalid JWS iat signed ${unixTimetsamp - header.iat} seconds ago`, 400);
        }
        await (0, exports.validateChallenge)(payload);
        const thumbprint = await (0, utils_1.getJWKthumbprint)(header.jwk);
        (0, utils_1.invariant)(request.session, "Session not available");
        const apiKey = await (0, utils_1.signJWS)({ alg: "ES384", sub: "api-key" }, thumbprint, await sessionKey);
        return Service_1.Service.successResponse(apiKey);
    }
    catch (e) {
        throw Service_1.Service.rejectError(e);
    }
};
exports.loginWithChallenge = loginWithChallenge;
/**
 * Logs out current logged in user session
 *
 *
 * no response value expected for this operation
 * */
const logoutUser = async () => {
    try {
        return Service_1.Service.successResponse(undefined);
    }
    catch (e) {
        throw Service_1.Service.rejectResponse(e.message || "Invalid input", e.status || 405);
    }
};
exports.logoutUser = logoutUser;
/**
 * Upload a password-protected backup
 *
 *
 * backupKey String sha256(thumbprint+password)
 * uploadBackupRequest UploadBackupRequest
 * returns String
 * */
const uploadBackup = async ({ backupKey, uploadBackupRequest, }) => {
    try {
        return Service_1.Service.successResponse(JSON.stringify({
            backupKey,
            uploadBackupRequest,
        }));
    }
    catch (e) {
        throw Service_1.Service.rejectResponse(e.message || "Invalid input", e.status || 405);
    }
};
exports.uploadBackup = uploadBackup;
