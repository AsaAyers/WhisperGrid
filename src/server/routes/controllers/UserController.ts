import { Request, Response } from "express";
import { Controller } from "./Controller";
import * as service from "../services/UserService";

export const getBackup = async (request: Request, response: Response) => {
  await Controller.handleRequest(request, response, service.getBackup);
};

export const getLoginChallenge = async (
  request: Request,
  response: Response,
) => {
  // response.json(await makeLoginChallenge());
  await Controller.handleRequest(request, response, service.getLoginChallenge);
};

export const loginWithChallenge = async (
  request: Request,
  response: Response,
) => {
  await Controller.handleRequest(
    request,
    response,
    service.loginWithChallenge,
    "loginRequest",
  );
};

export const logoutUser = async (request: Request, response: Response) => {
  await Controller.handleRequest(request, response, service.logoutUser);
};

export const uploadBackup = async (request: Request, response: Response) => {
  await Controller.handleRequest(request, response, service.uploadBackup);
};
