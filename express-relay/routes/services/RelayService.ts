import { Service, ServiceHandler } from "./Service";
import { RelayApi } from "../../../src/openapi-client";

type T = ServiceHandler<InstanceType<typeof RelayApi>>;

/**
 * Get relay invite by thumbprint
 *
 *
 * thumbprint String
 * returns Invite
 * */
export const getInvite: T["getInvite"] = async ({ thumbprint }) => {
  try {
    console.log({ thumbprint });
    return Service.successResponse("invite" as any);
  } catch (e) {
    throw Service.rejectResponse(e.message || "Invalid input", e.status || 405);
  }
};
/**
 * Get a thread by threadId
 *
 *
 * threadId String
 * returns List
 * */
export const getThread: T["getThread"] = async ({ threadId }) => {
  try {
    console.log({ threadId });
    return Service.successResponse([]);
  } catch (e) {
    throw Service.rejectResponse(e.message || "Invalid input", e.status || 405);
  }
};

export const getMyThreads: T["getMyThreads"] = async () => {
  try {
    return Service.successResponse(["a", "b"]);
  } catch (e) {
    throw Service.rejectResponse(e.message || "Invalid input", e.status || 405);
  }
};

/**
 * Post an invite
 *
 * invite Invite The invite is validated, and then stored by its thumbprint.
 * returns String
 * */
export const publishInvite: T["publishInvite"] = async ({ invite }) => {
  try {
    return Service.successResponse(invite as any);
  } catch (e) {
    throw Service.rejectResponse(e.message || "Invalid input", e.status || 405);
  }
};
/**
 * Post a reply
 *
 * threadId String
 * publishReplyRequest PublishReplyRequest
 * returns String
 * */
export const publishReply: T["publishReply"] = async ({
  threadId,
  publishReplyRequest,
}) => {
  try {
    return Service.successResponse(
      JSON.stringify({
        threadId,
        publishReplyRequest,
      }),
    );
  } catch (e) {
    throw Service.rejectResponse(e.message || "Invalid input", e.status || 405);
  }
};
/**
 * Reply to a relay invite
 *
 *
 * thumbprint String JWK Thumbprint https://www.rfc-editor.org/rfc/rfc7638
 * replyToInvite ReplyToInvite
 * returns replyToInvite_200_response
 * */
export const replyToInvite: T["replyToInvite"] = async ({
  thumbprint,
  replyToInvite,
}) => {
  try {
    console.log({ thumbprint, replyToInvite });
    return Service.successResponse({
      threadId: "threadId",
    });
  } catch (e) {
    throw Service.rejectResponse(e.message || "Invalid input", e.status || 405);
  }
};
