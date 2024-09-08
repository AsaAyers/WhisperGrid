/* tslint:disable */
/* eslint-disable */
/**
 * OpenAPI WhisperGrid
 * OpenAPI definition for WhisperGrid relays.
 *
 * The version of the OpenAPI document: 1.0.0
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from "../runtime";
/**
 *
 * @export
 * @interface LoginRequest
 */
export interface LoginRequest {
  /**
   * The signed challenge is a JWS signed with the user's private key. { header: { sub: 'login', iat, challengeURL }, payload: /login/challenge }
   * @type {string}
   * @memberof LoginRequest
   */
  signedChallenge: string;
}

/**
 * Check if a given object implements the LoginRequest interface.
 */
export function instanceOfLoginRequest(value: object): value is LoginRequest {
  if (!("signedChallenge" in value) || value["signedChallenge"] === undefined)
    return false;
  return true;
}

export function LoginRequestFromJSON(json: any): LoginRequest {
  return LoginRequestFromJSONTyped(json, false);
}

export function LoginRequestFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): LoginRequest {
  if (json == null) {
    return json;
  }
  return {
    signedChallenge: json["signedChallenge"],
  };
}

export function LoginRequestToJSON(value?: LoginRequest | null): any {
  if (value == null) {
    return value;
  }
  return {
    signedChallenge: value["signedChallenge"],
  };
}