import { BaseAPI } from "../../../src/openapi-client";

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

  static successResponse<T>(
    payload: T extends Promise<any> ? never : T,
    code = 200,
  ): SuccessResponse<T> {
    return { payload, code };
  }
}

export type ServiceHandler<T extends BaseAPI> = {
  [K in keyof T]: T[K] extends (
    // params: infer P,
    r: RequestInit,
  ) => Promise<infer R>
    ? () => Promise<SuccessResponse<R>>
    : T[K] extends (params: infer P, r: RequestInit) => Promise<infer R>
      ? (params: P) => Promise<SuccessResponse<R>>
      : never;
};
