/**
 * The RelayController file is a very simple one, which does not need to be changed manually,
 * unless there's a case where business logic routes the request to an entity which is not
 * the service.
 * The heavy lifting of the Controller item is done in Request.js - that is where request
 * parameters are extracted and sent to the service, and where response is handled.
 */

import { Controller } from "./Controller";
import * as service from "../services/RelayService";
import { Request, Response } from "express";

type Handler = (request: Request, response: Response) => Promise<void>;

export const getInvite: Handler = async (request, response) => {
  await Controller.handleRequest(request, response, service.getInvite);
};

export const getThread: Handler = async (request, response) => {
  await Controller.handleRequest(request, response, service.getThread);
};

export const publishInvite: Handler = async (request, response) => {
  await Controller.handleRequest(request, response, service.publishInvite);
};

export const publishReply: Handler = async (request, response) => {
  await Controller.handleRequest(request, response, service.publishReply);
};

export const replyToInvite: Handler = async (request, response) => {
  await Controller.handleRequest(request, response, service.replyToInvite);
};
