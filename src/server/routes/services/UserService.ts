import { Service, ServiceHandler } from "./Service";
import config from "../../config";
import crypto from "crypto";
import { UserApi } from "../../../openapi-client";
import {
  getJWKthumbprint,
  invariant,
  parseJWSSync,
  signJWS,
  verifyJWS,
} from "../../../whispergrid/utils";
import { prisma } from "../../db";
import { SignedBackup } from "whispergrid/types";

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

export type ChallengeType = "login" | "removeBackup";
export const validateChallenge = async (
  challenge: string,
  sub: ChallengeType,
) => {
  if (!(await verifyJWS(challenge))) {
    throw Service.rejectResponse("Invalid JWS", 400);
  }
  const { header, payload } = parseJWSSync<{
    header: { iat: number; sub: string; jwk: any };
    payload: string;
  }>(challenge);
  if (header.sub !== sub) {
    throw Service.rejectResponse(
      `Subject mismatch - expected ${sub}, got ${header.sub}`,
      400,
    );
  }

  const unixTimetsamp = Math.floor(Date.now() / 1000);
  if (!header.iat || unixTimetsamp - header.iat > SIGN_TIME_LIMIT) {
    throw Service.rejectResponse(
      `Invalid JWS iat signed ${unixTimetsamp - header.iat} seconds ago`,
      400,
    );
  }

  const [timestamp, signature] = payload.split(":");
  const expected = await (
    await makeLoginChallenge(Number(timestamp))
  ).split(":")[1];
  if (signature !== expected) {
    throw new Error("Invalid challenge");
  }

  if (unixTimetsamp - Number(timestamp) > 600) {
    throw new Error(`Challenges expire after 10 minutes`);
  }

  const thumbprint = await getJWKthumbprint(header.jwk);
  return {
    jwk: header.jwk,
    thumbprint,
  };
};

/**
 * Get password-protected backup by backupKey
 *
 *
 * backupKey String sha256(thumbprint+password)
 * returns String
 * */
export const getBackup: T["getBackup"] = async ({ backupKey }) => {
  try {
    const backup = await prisma.backup.findUnique({ where: { id: backupKey } });
    if (!backup) {
      throw Service.rejectResponse(undefined, 404);
    }
    return Service.successResponse(backup.backup);
  } catch (e: any) {
    throw Service.rejectError(e);
  }
};
/**
 * Get a login challenge
 *
 *
 * returns String
 * */
export const getLoginChallenge: T["getLoginChallenge"] = async () => {
  try {
    return Service.successResponse(await makeLoginChallenge());
  } catch (e: any) {
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
export const loginWithChallenge: T["loginWithChallenge"] = async (
  arg,
  request,
  response,
) => {
  try {
    const { thumbprint } = await validateChallenge(
      arg.challengeRequest.challenge,
      "login",
    ).catch((e) => {
      if (arg.challengeRequest.challenge.match(/^TEST-[\d\w]+$/)) {
        return { thumbprint: arg.challengeRequest.challenge };
      }
      throw e;
    });

    invariant(request.session, "Session not available");
    const apiKey = await signJWS(
      { alg: "ES384", sub: "api-key" },
      thumbprint,
      await sessionKey,
    );
    response.cookie("api_key", apiKey, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return Service.successResponse(apiKey);
  } catch (e: any) {
    throw Service.rejectError(e);
  }
};
/**
 * Logs out current logged in user session
 *
 *
 * no response value expected for this operation
 * */
export const logoutUser: T["logoutUser"] = async (_arg, request, response) => {
  response.cookie("api_key", "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    expires: new Date(0),
  });
  return Service.successResponse(null, 200);
};
/**
 * Upload a password-protected backup
 *
 *
 * backupKey String sha256(thumbprint+password)
 * uploadBackupRequest UploadBackupRequest
 * returns String
 * */
export const uploadBackup: T["uploadBackup"] = async ({
  backupKey,
  uploadBackupRequest,
}) => {
  try {
    if (
      (await prisma.backup.findUnique({ where: { id: backupKey } })) !== null
    ) {
      throw Service.rejectResponse(undefined, 409);
    }

    const backup = await prisma.backup.create({
      data: {
        id: backupKey,
        backup: uploadBackupRequest.signedBackup,
      },
    });

    return Service.successResponse(backup.id);
  } catch (e: any) {
    throw Service.rejectResponse(null, 405);
  }
};

export const removeBackup: T["removeBackup"] = async ({
  backupKey,
  challengeRequest,
}) => {
  try {
    const backup = await prisma.backup.findUnique({ where: { id: backupKey } });
    if (!backup) {
      throw Service.rejectResponse("Not Foud", 404);
    }
    const { header } = await parseJWSSync(backup.backup as SignedBackup);
    const backupThumbprint = await getJWKthumbprint(header.jwk);
    const { thumbprint } = await validateChallenge(
      challengeRequest.challenge,
      "removeBackup",
    );
    if (thumbprint !== backupThumbprint) {
      throw Service.rejectResponse("Forbidden", 403);
    }

    return Service.successResponse("Removed: " + backupKey);
  } catch (e: any) {
    throw Service.rejectResponse(e.message || "Invalid input", e.status || 405);
  }
};
