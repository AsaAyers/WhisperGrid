import { Response, Request } from "express";
import {
  OpenApiRequestMetadata,
  OpenAPIV3,
} from "express-openapi-validator/dist/framework/types";
import { SuccessResponse } from "../services/Service";

const fs = require("fs");
const path = require("path");
const camelCase = require("camelcase");
const config = require("../../config");
// const logger = require('../logger');

const isReference = (val: any): val is OpenAPIV3.ReferenceObject =>
  val != null && "$ref" in val;

const schemaValue = <T extends any | OpenAPIV3.ReferenceObject>(
  val: T | OpenAPIV3.ReferenceObject,
): T extends OpenAPIV3.ReferenceObject ? never : T => {
  if (isReference(val)) {
    throw new Error("Reference parameters are not supported");
  }
  return val as any;
};

declare module "express" {
  interface Request {
    openapi: OpenApiRequestMetadata;
  }
}

export class Controller {
  static sendResponse(
    response: Response,
    payload: {
      code?: number;
      payload: any;
    },
  ) {
    /**
     * The default response-code is 200. We want to allow to change that. in That case,
     * payload will be an object consisting of a code and a payload. If not customized
     * send 200 and the payload as received in this method.
     */
    response.status(payload.code || 200);
    const responsePayload =
      payload.payload !== undefined ? payload.payload : payload;
    if (
      responsePayload instanceof Object ||
      typeof responsePayload === "string"
    ) {
      response.json(responsePayload);
    } else {
      response.end(responsePayload);
    }
  }

  static sendError(response: Response, error: any) {
    response.status(error.code || 500);
    if (error.error instanceof Object || typeof error.error === "string") {
      response.json(error.error);
    } else {
      response.end(error.error || error.message);
    }
  }

  /**
   * Files have been uploaded to the directory defined by config.js as upload directory
   * Files have a temporary name, that was saved as 'filename' of the file object that is
   * referenced in request.files array.
   * This method finds the file and changes it to the file name that was originally called
   * when it was uploaded. To prevent files from being overwritten, a timestamp is added between
   * the filename and its extension
   * @param request
   * @param fieldName
   * @returns {string}
   */
  static collectFile(request: Request, fieldName: string) {
    let uploadedFileName = "";
    if (Array.isArray(request.files) && request.files.length > 0) {
      const fileObject = request.files.find(
        (file) => file.fieldname === fieldName,
      );
      if (fileObject) {
        const fileArray = fileObject.originalname.split(".");
        const extension = fileArray.pop();
        fileArray.push(`_${Date.now()}`);
        uploadedFileName = `${fileArray.join("")}.${extension}`;
        fs.renameSync(
          path.join(config.FILE_UPLOAD_PATH, fileObject.filename),
          path.join(config.FILE_UPLOAD_PATH, uploadedFileName),
        );
      }
    }
    return uploadedFileName;
  }

  static getRequestBodyName(request: Request, defaultBodyName = "body") {
    const codeGenDefinedBodyName =
      request.openapi.schema["x-codegen-request-body-name"];
    if (codeGenDefinedBodyName !== undefined) {
      return codeGenDefinedBodyName;
    }

    const refObjectPath = (request as any).openapi.schema.requestBody.content?.[
      "application/json"
    ].schema.$ref;
    if (refObjectPath !== undefined && refObjectPath.length > 0) {
      return refObjectPath.substr(refObjectPath.lastIndexOf("/") + 1);
    }
    return defaultBodyName;
  }

  static collectRequestParams(request: Request, defaultBodyName = "body") {
    const requestParams: any = {};

    if (
      request.openapi.schema.requestBody !== undefined &&
      !isReference(request.openapi.schema.requestBody)
    ) {
      const content = request.openapi.schema.requestBody?.content;

      if (!content) {
        // ignore
      } else if (content["application/json"] !== undefined) {
        const requestBodyName = camelCase(
          this.getRequestBodyName(request, defaultBodyName),
        );
        requestParams[requestBodyName] = request.body;
      } else if (content["multipart/form-data"] !== undefined) {
        Object.keys(
          schemaValue(content["multipart/form-data"].schema)?.properties ?? {},
        ).forEach((property) => {
          const schema = content["multipart/form-data"].schema;
          const propertyObject = isReference(schema)
            ? null
            : schema?.properties?.[property];

          if (
            propertyObject != null &&
            !isReference(propertyObject) &&
            propertyObject.format !== undefined &&
            propertyObject.format === "binary"
          ) {
            requestParams[property] = this.collectFile(request, property);
          } else {
            requestParams[property] = request.body[property];
          }
        });
      }
    }

    request.openapi.schema.parameters?.forEach((param) => {
      if (isReference(param)) {
        throw new Error("Reference parameters are not supported");
      }

      if (param.in === "path") {
        requestParams[param.name] = request.openapi.pathParams[param.name];
      } else if (param.in === "query") {
        requestParams[param.name] = request.query[param.name];
      } else if (param.in === "header") {
        requestParams[param.name] = request.headers[param.name];
      }
    });
    return requestParams;
  }

  static async handleRequest<Args, Result>(
    request: Request,
    response: Response,
    serviceOperation: (
      args: Args,
      r: Response,
    ) => Promise<SuccessResponse<Result>>,
    bodyName = "body",
  ) {
    try {
      const serviceResponse = await serviceOperation(
        this.collectRequestParams(request, bodyName) as any,
        response,
      );
      Controller.sendResponse(response, serviceResponse);
    } catch (error) {
      Controller.sendError(response, error);
    }
  }
}
