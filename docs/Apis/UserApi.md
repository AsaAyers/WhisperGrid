# UserApi

All URIs are relative to _http://localhost:1234_

| Method                                                  | HTTP request                 | Description                                |
| ------------------------------------------------------- | ---------------------------- | ------------------------------------------ |
| [**getBackup**](UserApi.md#getBackup)                   | **GET** /backup/{backupKey}  | Get password-protected backup by backupKey |
| [**getLoginChallenge**](UserApi.md#getLoginChallenge)   | **GET** /login/challenge     | Get a login challenge                      |
| [**loginWithChallenge**](UserApi.md#loginWithChallenge) | **POST** /login              | Login with a challenge                     |
| [**logoutUser**](UserApi.md#logoutUser)                 | **GET** /user/logout         | Logs out current logged in user session    |
| [**uploadBackup**](UserApi.md#uploadBackup)             | **POST** /backup/{backupKey} | Upload a password-protected backup         |

<a name="getBackup"></a>

# **getBackup**

> String getBackup(backupKey)

Get password-protected backup by backupKey

### Parameters

| Name          | Type       | Description                 | Notes             |
| ------------- | ---------- | --------------------------- | ----------------- |
| **backupKey** | **String** | sha256(thumbprint+password) | [default to null] |

### Return type

**String**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

<a name="getLoginChallenge"></a>

# **getLoginChallenge**

> String getLoginChallenge()

Get a login challenge

### Parameters

This endpoint does not need any parameter.

### Return type

**String**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

<a name="loginWithChallenge"></a>

# **loginWithChallenge**

> String loginWithChallenge(LoginRequest)

Login with a challenge

### Parameters

| Name             | Type                                          | Description | Notes |
| ---------------- | --------------------------------------------- | ----------- | ----- |
| **LoginRequest** | [**LoginRequest**](../Models/LoginRequest.md) |             |       |

### Return type

**String**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

<a name="logoutUser"></a>

# **logoutUser**

> logoutUser()

Logs out current logged in user session

### Parameters

This endpoint does not need any parameter.

### Return type

null (empty response body)

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

<a name="uploadBackup"></a>

# **uploadBackup**

> String uploadBackup(backupKey, uploadBackup_request)

Upload a password-protected backup

### Parameters

| Name                     | Type                                                          | Description                 | Notes             |
| ------------------------ | ------------------------------------------------------------- | --------------------------- | ----------------- |
| **backupKey**            | **String**                                                    | sha256(thumbprint+password) | [default to null] |
| **uploadBackup_request** | [**uploadBackup_request**](../Models/uploadBackup_request.md) |                             |                   |

### Return type

**String**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json
