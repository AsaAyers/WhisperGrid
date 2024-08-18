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


import * as runtime from '../runtime';
import type {
  Invite,
  PublishReplyRequest,
  ReplyToInvite,
  ReplyToInvite200Response,
} from '../models/index';
import {
    InviteFromJSON,
    InviteToJSON,
    PublishReplyRequestFromJSON,
    PublishReplyRequestToJSON,
    ReplyToInviteFromJSON,
    ReplyToInviteToJSON,
    ReplyToInvite200ResponseFromJSON,
    ReplyToInvite200ResponseToJSON,
} from '../models/index';

export interface GetInviteRequest {
    thumbprint: string;
}

export interface GetThreadRequest {
    threadId: string;
}

export interface PublishInviteRequest {
    invite: Invite;
}

export interface PublishReplyOperationRequest {
    threadId: string;
    publishReplyRequest: PublishReplyRequest;
}

export interface ReplyToInviteRequest {
    thumbprint: string;
    replyToInvite: ReplyToInvite;
}

/**
 * 
 */
export class RelayApi extends runtime.BaseAPI {

    /**
     * 
     * Get relay invite by thumbprint
     */
    async getInviteRaw(requestParameters: GetInviteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<string>> {
        if (requestParameters['thumbprint'] == null) {
            throw new runtime.RequiredError(
                'thumbprint',
                'Required parameter "thumbprint" was null or undefined when calling getInvite().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/invite/{thumbprint}`.replace(`{${"thumbprint"}}`, encodeURIComponent(String(requestParameters['thumbprint']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        if (this.isJsonMime(response.headers.get('content-type'))) {
            return new runtime.JSONApiResponse<string>(response);
        } else {
            return new runtime.TextApiResponse(response) as any;
        }
    }

    /**
     * 
     * Get relay invite by thumbprint
     */
    async getInvite(requestParameters: GetInviteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<string> {
        const response = await this.getInviteRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * 
     * Get a thread by threadId
     */
    async getThreadRaw(requestParameters: GetThreadRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<string>>> {
        if (requestParameters['threadId'] == null) {
            throw new runtime.RequiredError(
                'threadId',
                'Required parameter "threadId" was null or undefined when calling getThread().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/thread/{threadId}`.replace(`{${"threadId"}}`, encodeURIComponent(String(requestParameters['threadId']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse<any>(response);
    }

    /**
     * 
     * Get a thread by threadId
     */
    async getThread(requestParameters: GetThreadRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<string>> {
        const response = await this.getThreadRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Post an invite
     */
    async publishInviteRaw(requestParameters: PublishInviteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<string>> {
        if (requestParameters['invite'] == null) {
            throw new runtime.RequiredError(
                'invite',
                'Required parameter "invite" was null or undefined when calling publishInvite().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/invite`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: InviteToJSON(requestParameters['invite']),
        }, initOverrides);

        if (this.isJsonMime(response.headers.get('content-type'))) {
            return new runtime.JSONApiResponse<string>(response);
        } else {
            return new runtime.TextApiResponse(response) as any;
        }
    }

    /**
     * Post an invite
     */
    async publishInvite(requestParameters: PublishInviteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<string> {
        const response = await this.publishInviteRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Post a reply
     */
    async publishReplyRaw(requestParameters: PublishReplyOperationRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<string>> {
        if (requestParameters['threadId'] == null) {
            throw new runtime.RequiredError(
                'threadId',
                'Required parameter "threadId" was null or undefined when calling publishReply().'
            );
        }

        if (requestParameters['publishReplyRequest'] == null) {
            throw new runtime.RequiredError(
                'publishReplyRequest',
                'Required parameter "publishReplyRequest" was null or undefined when calling publishReply().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/thread/{threadId}`.replace(`{${"threadId"}}`, encodeURIComponent(String(requestParameters['threadId']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: PublishReplyRequestToJSON(requestParameters['publishReplyRequest']),
        }, initOverrides);

        if (this.isJsonMime(response.headers.get('content-type'))) {
            return new runtime.JSONApiResponse<string>(response);
        } else {
            return new runtime.TextApiResponse(response) as any;
        }
    }

    /**
     * Post a reply
     */
    async publishReply(requestParameters: PublishReplyOperationRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<string> {
        const response = await this.publishReplyRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * 
     * Reply to a relay invite
     */
    async replyToInviteRaw(requestParameters: ReplyToInviteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ReplyToInvite200Response>> {
        if (requestParameters['thumbprint'] == null) {
            throw new runtime.RequiredError(
                'thumbprint',
                'Required parameter "thumbprint" was null or undefined when calling replyToInvite().'
            );
        }

        if (requestParameters['replyToInvite'] == null) {
            throw new runtime.RequiredError(
                'replyToInvite',
                'Required parameter "replyToInvite" was null or undefined when calling replyToInvite().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/invite/{thumbprint}/reply`.replace(`{${"thumbprint"}}`, encodeURIComponent(String(requestParameters['thumbprint']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: ReplyToInviteToJSON(requestParameters['replyToInvite']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ReplyToInvite200ResponseFromJSON(jsonValue));
    }

    /**
     * 
     * Reply to a relay invite
     */
    async replyToInvite(requestParameters: ReplyToInviteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ReplyToInvite200Response> {
        const response = await this.replyToInviteRaw(requestParameters, initOverrides);
        return await response.value();
    }

}
