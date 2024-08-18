/**
 * The RelayController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

const Controller = require("./Controller");
const service = require("../services/RelayService");
const getInvite = async (request, response) => {
  await Controller.handleRequest(request, response, service.getInvite);
};

const getThread = async (request, response) => {
  await Controller.handleRequest(request, response, service.getThread);
};

const publishInvite = async (request, response) => {
  await Controller.handleRequest(request, response, service.publishInvite);
};

const publishReply = async (request, response) => {
  await Controller.handleRequest(request, response, service.publishReply);
};

const replyToInvite = async (request, response) => {
  await Controller.handleRequest(request, response, service.replyToInvite);
};

module.exports = {
  getInvite,
  getThread,
  publishInvite,
  publishReply,
  replyToInvite,
};
