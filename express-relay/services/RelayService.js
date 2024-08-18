/* eslint-disable no-unused-vars */
const Service = require("./Service");

/**
 * Get relay invite by thumbprint
 *
 *
 * thumbprint String
 * returns Invite
 * */
const getInvite = ({ thumbprint }) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          thumbprint,
        }),
      );
    } catch (e) {
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 405),
      );
    }
  });
/**
 * Get a thread by threadId
 *
 *
 * threadId String
 * returns List
 * */
const getThread = ({ threadId }) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          threadId,
        }),
      );
    } catch (e) {
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 405),
      );
    }
  });
/**
 * Post an invite
 *
 * invite Invite The invite is validated, and then stored by its thumbprint.
 * returns String
 * */
const publishInvite = ({ invite }) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          invite,
        }),
      );
    } catch (e) {
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 405),
      );
    }
  });
/**
 * Post a reply
 *
 * threadId String
 * publishReplyRequest PublishReplyRequest
 * returns String
 * */
const publishReply = ({ threadId, publishReplyRequest }) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          threadId,
          publishReplyRequest,
        }),
      );
    } catch (e) {
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 405),
      );
    }
  });
/**
 * Reply to a relay invite
 *
 *
 * thumbprint String JWK Thumbprint https://www.rfc-editor.org/rfc/rfc7638
 * replyToInvite ReplyToInvite
 * returns replyToInvite_200_response
 * */
const replyToInvite = ({ thumbprint, replyToInvite }) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          thumbprint,
          replyToInvite,
        }),
      );
    } catch (e) {
      reject(
        Service.rejectResponse(e.message || "Invalid input", e.status || 405),
      );
    }
  });

module.exports = {
  getInvite,
  getThread,
  publishInvite,
  publishReply,
  replyToInvite,
};
