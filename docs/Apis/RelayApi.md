# RelayApi

All URIs are relative to *http://whispergrid.example.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getInvite**](RelayApi.md#getInvite) | **GET** /invite/{thumbprint} | Get relay invite by thumbprint |
| [**getThread**](RelayApi.md#getThread) | **GET** /thread/{threadId} | Get a thread by threadId |
| [**publishInvite**](RelayApi.md#publishInvite) | **POST** /invite | Post an invite |
| [**publishReply**](RelayApi.md#publishReply) | **POST** /thread/{threadId} | Post a reply |
| [**replyToInvite**](RelayApi.md#replyToInvite) | **POST** /invite/{thumbprint}/reply | Reply to a relay invite |


<a name="getInvite"></a>
# **getInvite**
> String getInvite(thumbprint)

Get relay invite by thumbprint

    

### Parameters

|Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **thumbprint** | **String**|  | [default to null] |

### Return type

**String**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

<a name="getThread"></a>
# **getThread**
> List getThread(threadId)

Get a thread by threadId

    

### Parameters

|Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **threadId** | **String**|  | [default to null] |

### Return type

**List**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

<a name="publishInvite"></a>
# **publishInvite**
> String publishInvite(Invite)

Post an invite

### Parameters

|Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **Invite** | [**Invite**](../Models/Invite.md)| The invite is validated, and then stored by its thumbprint. | |

### Return type

**String**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

<a name="publishReply"></a>
# **publishReply**
> String publishReply(threadId, publishReply\_request)

Post a reply

### Parameters

|Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **threadId** | **String**|  | [default to null] |
| **publishReply\_request** | [**publishReply_request**](../Models/publishReply_request.md)|  | |

### Return type

**String**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

<a name="replyToInvite"></a>
# **replyToInvite**
> replyToInvite_200_response replyToInvite(thumbprint, ReplyToInvite)

Reply to a relay invite

    

### Parameters

|Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **thumbprint** | **String**| JWK Thumbprint https://www.rfc-editor.org/rfc/rfc7638 | [default to null] |
| **ReplyToInvite** | [**ReplyToInvite**](../Models/ReplyToInvite.md)|  | |

### Return type

[**replyToInvite_200_response**](../Models/replyToInvite_200_response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

