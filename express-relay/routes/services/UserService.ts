import { Service, ServiceHandler } from "./Service";
import config from "../../config";
import crypto from "crypto";
import { UserApi } from "../../../src/openapi-client";
import {
  getJWKthumbprint,
  invariant,
  parseJWSSync,
  signJWS,
  verifyJWS,
} from "../../../src/client/utils";
import { response } from "express";

type T = ServiceHandler<InstanceType<typeof UserApi>>;

const sessionKey = config.sessionPrivateKey;
const SIGN_TIME_LIMIT = 60;

export const makeLoginChallenge = async (
  now = Math.floor(Date.now() / 1000),
) => {
  const signature = Buffer.from(
    await crypto.subtle.digest(
      "SHA-256",
      Buffer.from(`${config.SERVER_SECRET}${now}`),
    ),
  ).toString("hex");
  return `${now}:${signature}`;
};

export const validateChallenge = async (challenge: string) => {
  const [timestamp, signature] = challenge.split(":");
  const expected = await (
    await makeLoginChallenge(Number(timestamp))
  ).split(":")[1];
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

/**
 * Get password-protected backup by backupKey
 *
 *
 * backupKey String sha256(thumbprint+password)
 * returns String
 * */
const getBackup: T["getBackup"] = async ({ backupKey }) => {
  try {
    return Service.successResponse(backupKey);
  } catch (e) {
    throw Service.rejectResponse(e.message || "Invalid input", e.status || 405);
  }
};
/**
 * Get a login challenge
 *
 *
 * returns String
 * */
const getLoginChallenge: T["getLoginChallenge"] = async () => {
  try {
    return Service.successResponse(await makeLoginChallenge());
  } catch (e) {
    throw Service.rejectResponse(e.message || "Invalid input", e.status || 405);
  }
};
/**
 * Login with a challenge
 *
 *
 * signedChallenge String JWS - { header: { iat, sub: 'challenge', jwk, }, payload: challenge }
 * returns String
 * */
const loginWithChallenge: T["loginWithChallenge"] = async (
  { loginRequest: { signedChallenge } },
  request,
) => {
  try {
    if (!(await verifyJWS(signedChallenge))) {
      throw Service.rejectResponse("Invalid JWS", 400);
    }
    const { header, payload } = parseJWSSync<{
      header: { iat: number; sub: string; jwk: any };
      payload: string;
    }>(signedChallenge);
    if (header.sub !== "challenge") {
      throw Service.rejectResponse("Invalid JWS", 400);
    }

    const unixTimetsamp = Math.floor(Date.now() / 1000);
    if (!header.iat || unixTimetsamp - header.iat > SIGN_TIME_LIMIT) {
      throw Service.rejectResponse(
        `Invalid JWS iat signed ${unixTimetsamp - header.iat} seconds ago`,
        400,
      );
    }
    await validateChallenge(payload);

    const thumbprint = await getJWKthumbprint(header.jwk);
    invariant(request.session, "Session not available");
    const apiKey = await signJWS(
      { alg: "ES384", sub: "api-key" },
      thumbprint,
      await sessionKey,
    );
    // response.cookie("api_key", apiKey);
    // request.cookies["api_key"] = apiKey;
    response.header("Set-Cookie", `api_key=${apiKey}; HttpOnly`);
    return Service.successResponse(apiKey);
  } catch (e) {
    throw Service.rejectError(e);
  }
};
/**
 * Logs out current logged in user session
 *
 *
 * no response value expected for this operation
 * */
const logoutUser: T["logoutUser"] = async () => {
  try {
    return Service.successResponse(undefined);
  } catch (e) {
    throw Service.rejectResponse(e.message || "Invalid input", e.status || 405);
  }
};
/**
 * Upload a password-protected backup
 *
 *
 * backupKey String sha256(thumbprint+password)
 * uploadBackupRequest UploadBackupRequest
 * returns String
 * */
const uploadBackup: T["uploadBackup"] = async ({
  backupKey,
  uploadBackupRequest,
}) => {
  try {
    return Service.successResponse(
      JSON.stringify({
        backupKey,
        uploadBackupRequest,
      }),
    );
  } catch (e) {
    throw Service.rejectResponse(e.message || "Invalid input", e.status || 405);
  }
};

export {
  getBackup,
  getLoginChallenge,
  loginWithChallenge,
  logoutUser,
  uploadBackup,
};
