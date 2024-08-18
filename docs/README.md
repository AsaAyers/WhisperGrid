# Documentation for OpenAPI WhisperGrid

<a name="documentation-for-api-endpoints"></a>
## Documentation for API Endpoints

All URIs are relative to *http://whispergrid.example.com*

| Class | Method | HTTP request | Description |
|------------ | ------------- | ------------- | -------------|
| *RelayApi* | [**getInvite**](Apis/RelayApi.md#getinvite) | **GET** /invite/{thumbprint} | Get relay invite by thumbprint |
*RelayApi* | [**getThread**](Apis/RelayApi.md#getthread) | **GET** /thread/{threadId} | Get a thread by threadId |
*RelayApi* | [**publishInvite**](Apis/RelayApi.md#publishinvite) | **POST** /invite | Post an invite |
*RelayApi* | [**publishReply**](Apis/RelayApi.md#publishreply) | **POST** /thread/{threadId} | Post a reply |
*RelayApi* | [**replyToInvite**](Apis/RelayApi.md#replytoinvite) | **POST** /invite/{thumbprint}/reply | Reply to a relay invite |
| *UserApi* | [**getBackup**](Apis/UserApi.md#getbackup) | **GET** /backup/{backupKey} | Get password-protected backup by backupKey |
*UserApi* | [**getLoginChallenge**](Apis/UserApi.md#getloginchallenge) | **GET** /login/challenge | Get a login challenge |
*UserApi* | [**loginWithChallenge**](Apis/UserApi.md#loginwithchallenge) | **POST** /login | Login with a challenge |
*UserApi* | [**logoutUser**](Apis/UserApi.md#logoutuser) | **GET** /user/logout | Logs out current logged in user session |
*UserApi* | [**uploadBackup**](Apis/UserApi.md#uploadbackup) | **POST** /backup/{backupKey} | Upload a password-protected backup |


<a name="documentation-for-models"></a>
## Documentation for Models

 - [Invite](./Models/Invite.md)
 - [ReplyToInvite](./Models/ReplyToInvite.md)
 - [publishReply_request](./Models/publishReply_request.md)
 - [replyToInvite_200_response](./Models/replyToInvite_200_response.md)
 - [uploadBackup_request](./Models/uploadBackup_request.md)


<a name="documentation-for-authorization"></a>
## Documentation for Authorization

<a name="api_key"></a>
### api_key

- **Type**: API key
- **API key parameter name**: api_key
- **Location**: HTTP header

