"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyToInvite = exports.publishReply = exports.publishInvite = exports.getMyThreads = exports.getThread = exports.getInvite = void 0;
const Service_1 = require("./Service");
/**
 * Get relay invite by thumbprint
 *
 *
 * thumbprint String
 * returns Invite
 * */
const getInvite = async ({ thumbprint }) => {
    try {
        console.log({ thumbprint });
        return Service_1.Service.successResponse("invite");
    }
    catch (e) {
        throw Service_1.Service.rejectResponse(e.message || "Invalid input", e.status || 405);
    }
};
exports.getInvite = getInvite;
/**
 * Get a thread by threadId
 *
 *
 * threadId String
 * returns List
 * */
const getThread = async ({ threadId }) => {
    try {
        console.log({ threadId });
        return Service_1.Service.successResponse([]);
    }
    catch (e) {
        throw Service_1.Service.rejectResponse(e.message || "Invalid input", e.status || 405);
    }
};
exports.getThread = getThread;
const getMyThreads = async () => {
    try {
        return Service_1.Service.successResponse(["a", "b"]);
    }
    catch (e) {
        throw Service_1.Service.rejectResponse(e.message || "Invalid input", e.status || 405);
    }
};
exports.getMyThreads = getMyThreads;
/**
 * Post an invite
 *
 * invite Invite The invite is validated, and then stored by its thumbprint.
 * returns String
 * */
const publishInvite = async ({ invite }) => {
    try {
        return Service_1.Service.successResponse(invite);
    }
    catch (e) {
        throw Service_1.Service.rejectResponse(e.message || "Invalid input", e.status || 405);
    }
};
exports.publishInvite = publishInvite;
/**
 * Post a reply
 *
 * threadId String
 * publishReplyRequest PublishReplyRequest
 * returns String
 * */
const publishReply = async ({ threadId, publishReplyRequest, }) => {
    try {
        return Service_1.Service.successResponse(JSON.stringify({
            threadId,
            publishReplyRequest,
        }));
    }
    catch (e) {
        throw Service_1.Service.rejectResponse(e.message || "Invalid input", e.status || 405);
    }
};
exports.publishReply = publishReply;
/**
 * Reply to a relay invite
 *
 *
 * thumbprint String JWK Thumbprint https://www.rfc-editor.org/rfc/rfc7638
 * replyToInvite ReplyToInvite
 * returns replyToInvite_200_response
 * */
const replyToInvite = async ({ thumbprint, replyToInvite, }) => {
    try {
        console.log({ thumbprint, replyToInvite });
        return Service_1.Service.successResponse({
            threadId: "threadId",
        });
    }
    catch (e) {
        throw Service_1.Service.rejectResponse(e.message || "Invalid input", e.status || 405);
    }
};
exports.replyToInvite = replyToInvite;
