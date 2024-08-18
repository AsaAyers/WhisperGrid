/**
 * The UserController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

const Controller = require('./Controller');
const service = require('../services/UserService');
const getBackup = async (request, response) => {
  await Controller.handleRequest(request, response, service.getBackup);
};

const getLoginChallenge = async (request, response) => {
  await Controller.handleRequest(request, response, service.getLoginChallenge);
};

const loginWithChallenge = async (request, response) => {
  await Controller.handleRequest(request, response, service.loginWithChallenge);
};

const logoutUser = async (request, response) => {
  await Controller.handleRequest(request, response, service.logoutUser);
};

const uploadBackup = async (request, response) => {
  await Controller.handleRequest(request, response, service.uploadBackup);
};


module.exports = {
  getBackup,
  getLoginChallenge,
  loginWithChallenge,
  logoutUser,
  uploadBackup,
};
