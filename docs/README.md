# Documentation for OpenAPI WhisperGrid

<a name="documentation-for-api-endpoints"></a>

## Documentation for API Endpoints

All URIs are relative to _http://localhost:1234_

| Class      | Method                                                       | HTTP request                        | Description                                |
| ---------- | ------------------------------------------------------------ | ----------------------------------- | ------------------------------------------ |
| _RelayApi_ | [**getInvite**](Apis/RelayApi.md#getinvite)                  | **GET** /invite/{thumbprint}        | Get relay invite by thumbprint             |
| _RelayApi_ | [**getMyThreads**](Apis/RelayApi.md#getmythreads)            | **GET** /myThreads                  | Get all threads for the current user       |
| _RelayApi_ | [**getThread**](Apis/RelayApi.md#getthread)                  | **GET** /thread/{threadId}          | Get a thread by threadId                   |
| _RelayApi_ | [**publishInvite**](Apis/RelayApi.md#publishinvite)          | **POST** /invite                    | Post an invite                             |
| _RelayApi_ | [**publishReply**](Apis/RelayApi.md#publishreply)            | **POST** /thread/{threadId}         | Post a reply                               |
| _RelayApi_ | [**replyToInvite**](Apis/RelayApi.md#replytoinvite)          | **POST** /invite/{thumbprint}/reply | Reply to a relay invite                    |
| _UserApi_  | [**getBackup**](Apis/UserApi.md#getbackup)                   | **GET** /backup/{backupKey}         | Get password-protected backup by backupKey |
| _UserApi_  | [**getLoginChallenge**](Apis/UserApi.md#getloginchallenge)   | **GET** /login/challenge            | Get a login challenge                      |
| _UserApi_  | [**loginWithChallenge**](Apis/UserApi.md#loginwithchallenge) | **POST** /login                     | Login with a challenge                     |
| _UserApi_  | [**logoutUser**](Apis/UserApi.md#logoutuser)                 | **GET** /user/logout                | Logs out current logged in user session    |
| _UserApi_  | [**uploadBackup**](Apis/UserApi.md#uploadbackup)             | **POST** /backup/{backupKey}        | Upload a password-protected backup         |

<a name="documentation-for-models"></a>

## Documentation for Models

- [Invite](./Models/Invite.md)
- [LoginRequest](./Models/LoginRequest.md)
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

<a name="cookieAuth"></a>

### cookieAuth

- **Type**: API key
- **API key parameter name**: api_key
- **Location**:
