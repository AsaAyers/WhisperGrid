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
 * @interface ChallengeRequest
 */
export interface ChallengeRequest {
  /**
   * The signed challenge is a JWS signed with the user's private key. { header: { sub: 'login', iat, challengeURL }, payload: /login/challenge }
   * @type {string}
   * @memberof ChallengeRequest
   */
  challenge: string;
}

/**
 * Check if a given object implements the ChallengeRequest interface.
 */
export function instanceOfChallengeRequest(
  value: object,
): value is ChallengeRequest {
  if (!("challenge" in value) || value["challenge"] === undefined) return false;
  return true;
}

export function ChallengeRequestFromJSON(json: any): ChallengeRequest {
  return ChallengeRequestFromJSONTyped(json, false);
}

export function ChallengeRequestFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): ChallengeRequest {
  if (json == null) {
    return json;
  }
  return {
    challenge: json["challenge"],
  };
}

export function ChallengeRequestToJSON(value?: ChallengeRequest | null): any {
  if (value == null) {
    return value;
  }
  return {
    challenge: value["challenge"],
  };
}