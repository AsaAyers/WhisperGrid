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
 * @interface ReplyToInvite
 */
export interface ReplyToInvite {
  /**
   *
   * @type {string}
   * @memberof ReplyToInvite
   */
  replyToInvite: string;
}

/**
 * Check if a given object implements the ReplyToInvite interface.
 */
export function instanceOfReplyToInvite(value: object): value is ReplyToInvite {
  if (!("replyToInvite" in value) || value["replyToInvite"] === undefined)
    return false;
  return true;
}

export function ReplyToInviteFromJSON(json: any): ReplyToInvite {
  return ReplyToInviteFromJSONTyped(json, false);
}

export function ReplyToInviteFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): ReplyToInvite {
  if (json == null) {
    return json;
  }
  return {
    replyToInvite: json["ReplyToInvite"],
  };
}

export function ReplyToInviteToJSON(value?: ReplyToInvite | null): any {
  if (value == null) {
    return value;
  }
  return {
    ReplyToInvite: value["replyToInvite"],
  };
}