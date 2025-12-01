---
title: OAuth 2
tags: [network, security]
created-date: 2025-09-10T17:56:54-04:00
last-updated-date: 2025-11-30T21:29:24-05:00
---

**OAuth 2** is an industry-standard [HTTP](note/by/developer/network_protocols.md#HTTP) Based protocol for delegated authorization. It enables a client app to access protected resources on behalf of a user without requiring the user to share their credentials with the client app.

One good metaphor is that, bar are required verify customers' age. One way to do this is that each bar do their research and keep customers' records by their own (similar to creating username password everywhere). This involved a lot duplicated work, and prone for errors as well. The practical and correct way is that each bar trust the government ID and use that to verify customers' age, which is actually a form of delegated authorization.

## OAuth2 General Flow

![OAuth2 Diagram](Media/OAuth2.svg)

- User Click **Third Party Login** on Client Web App.
- Client Web App redirect user to Auth Provider Login Page, and user login there.
- Auth Provider redirect back user to Client Web App with Authorization Code as part of URL search parameters.
- Client Web App use the code to fetch tokens from Auth Server from **backend**.
- Auth Server return Tokens.
	- Access Token or refresh token based on Auth providers implementation.
	- ID Token if using [OpenID Connect](#OpenID%20Connect)
- Use Access Token for backend resources access.

Note:

- Auth Server would need the client web app URL in advance, so it will not redirect user to malicious location after they login.
- **Authorization Code** is extremely short living and **one time only**.
- **Access token** and **Refresh token** both are sensitive data, should never be exposed in URL.
- **Access Token** is usually short lived, is exchanged every time needed using **Refresh Token**.
- **Refresh Token** is long lived, and usually has rotating mechanism to extend.

## OpenID Connect

One related concept is **OpenID Connect**, which is a simple identity layer on top of the OAuth 2.0 protocol. So when client exchange tokens using redirection code, the server also returns a ID Token, which contains user information. It also specifies a user info endpoint for fetching user information using access token.

OpenID Connect also specifies defines a schema for API endpoints discovery. The schema should be available on a "well-known" location. Taking [Google's well-known location](https://accounts.google.com/.well-known/openid-configuration) as an example, it specified:

- Authorization Endpoint
- Token Endpoint
- Revocation Endpoint
- JWK Server Endpoint
- Type of claims and scopes

``` json
{
 "issuer": "https://accounts.google.com",
 "authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",
 "device_authorization_endpoint": "https://oauth2.googleapis.com/device/code",
 "token_endpoint": "https://oauth2.googleapis.com/token",
 "userinfo_endpoint": "https://openidconnect.googleapis.com/v1/userinfo",
 "revocation_endpoint": "https://oauth2.googleapis.com/revoke",
 "jwks_uri": "https://www.googleapis.com/oauth2/v3/certs",
 "response_types_supported": ["..."],
 "response_modes_supported": ["..."],
 "subject_types_supported": ["..."],
 "id_token_signing_alg_values_supported": ["..."],
 "scopes_supported": ["..."],
 "token_endpoint_auth_methods_supported": [
  "client_secret_post",
  "client_secret_basic"
 ],
 "claims_supported": ["..."],
 "code_challenge_methods_supported": ["..."],
 "grant_types_supported": ["..."]
}
```

## PKCE

One vulnerability in the original OAuth2 flow is the authorization code might be stolen, and the attacker use it faster than client to exchange tokens. **Proof Key for Code Exchange (PKCE)** is a mechanism to prevent this, by letting client app create a challenge and verify that during token exchange.

- When redirect to auth provider login page:
	- Client generate a `code_verifier` and create an hash out of it.
	- Client send the hash as challenge as part of URL search parameters.
- After client app use the authorization code for token exchange:
	- Use `code_verifier` as part of request, and server will only redeem the token if the code challenge passed.