/* eslint-disable no-unused-vars */
const Service = require("./Service");

/**
 * Get password-protected backup by backupKey
 *
 *
 * backupKey String sha256(thumbprint+password)
 * returns String
 * */
const getBackup = ({ backupKey }) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          backupKey,
        }),
      );
    } catch (e) {
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 405),
      );
    }
  });
/**
 * Get a login challenge
 *
 *
 * returns String
 * */
const getLoginChallenge = () =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(Service.successResponse({}));
    } catch (e) {
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 405),
      );
    }
  });
/**
 * Login with a challenge
 *
 *
 * signedChallenge String JWS - { header: { iat, sub: 'challenge', jwk, challengeUrl }, payload: challenge }
 * returns String
 * */
const loginWithChallenge = ({ signedChallenge }) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          signedChallenge,
        }),
      );
    } catch (e) {
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 405),
      );
    }
  });
/**
 * Logs out current logged in user session
 *
 *
 * no response value expected for this operation
 * */
const logoutUser = () =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(Service.successResponse({}));
    } catch (e) {
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 405),
      );
    }
  });
/**
 * Upload a password-protected backup
 *
 *
 * backupKey String sha256(thumbprint+password)
 * uploadBackupRequest UploadBackupRequest
 * returns String
 * */
const uploadBackup = ({ backupKey, uploadBackupRequest }) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          backupKey,
          uploadBackupRequest,
        }),
      );
    } catch (e) {
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 405),
      );
    }
  });

module.exports = {
  getBackup,
  getLoginChallenge,
  loginWithChallenge,
  logoutUser,
  uploadBackup,
};
