import { Service, ServiceHandler } from "./Service";
import config from "../../config";
import crypto from "crypto";
import { UserApi } from "../../../src/openapi-client";
import { parseJWSSync, verifyJWS } from "../../../src/client/utils";

type T = ServiceHandler<InstanceType<typeof UserApi>>;

export const makeLoginChallenge = async (now = Date.now()) => {
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
  if (signature !== (await makeLoginChallenge(Number(timestamp)))) {
    throw new Error("Invalid challenge");
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
  response,
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
    if (!header.iat || Date.now() - header.iat > 1000 * 60) {
      throw Service.rejectResponse("Invalid JWS", 400);
    }
    await validateChallenge(payload);

    response.headers.set(
      "Set-Cookie",
      `session=${signedChallenge}; Path=/; HttpOnly; Secure; SameSite=Strict`,
    );
    return Service.successResponse(JSON.stringify(signedChallenge));
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
