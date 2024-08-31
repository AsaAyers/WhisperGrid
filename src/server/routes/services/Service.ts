import { BaseAPI } from "../../../openapi-client";
import { Request, Response } from "express";

export type SuccessResponse<T> = {
  payload: T;
  code: number;
};

export type ErrorResponse = {
  error: any;
  code: number;
};
export class Service {
  static rejectResponse(error: any, code = 500): ErrorResponse {
    return { error, code };
  }

  static rejectError(error: any | ErrorResponse, code = 500): ErrorResponse {
    if ("code" in error) {
      return error;
    }
    return Service.rejectResponse(
      error.message || "Invalid input",
      error.status || code,
    );
  }
  static successResponse<T>(
    payload: T extends Promise<any> ? never : T,
    code = 200,
  ): SuccessResponse<T> {
    return { payload, code };
  }
}

export type ServiceHandler<T extends BaseAPI> = {
  [K in keyof T]: T[K] extends (r: RequestInit) => Promise<infer R>
    ? (
        params: unknown,
        request: Request,
        response: Response,
      ) => Promise<SuccessResponse<R extends void ? null : R>>
    : T[K] extends (params: infer P, r: RequestInit) => Promise<infer R>
      ? (
          params: P,
          request: Request,
          response: Response,
        ) => Promise<SuccessResponse<R extends void ? null : R>>
      : never;
};
