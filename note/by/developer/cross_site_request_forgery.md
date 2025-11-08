---
title: Cross-Site Request Forgery (CSRF)
tags: [network, web-dev]
created-date: 2025-10-19T14:44:56-04:00
last-updated-date: 2025-11-03T22:32:43-05:00
---

Browser persist cookies information in cross-site browsing context. Meaning leaving one site and re-entering, the cookies information is persisted and send with [HTTP](note/by/developer/network_protocols.md#HTTP) request to provide a better user experience, users don't need to re-login.

**Cross Site Request Forgery (CSRF)** abusing this mechanism to trick browser to send malicious request with cookie information attached, while which is not initialized by user intentionally.

Attacker can include the target site in submit form `<form action="https://attack-target" method="POST">` or as `<img src="https://attack-target">` to send request to server with cookies attached, however, server cannot tell will just treat them as normal requests.

## Cookie SameSite Attribute

The `SameSite` attribute of cookies has became a standard to prevent CSRF. The attribute allows three value:

- `none`: Where CSRF became a problem, cookie is shared
- `strict`: Disallow any cookies sharing in any cross-site browsing context. Typically used in scenarios like bank transaction page, where no external anchor is allowed.
- `lax`: The default option in modern browser.
	- Allowing Top level `GET` request, meaning browser visiting the page.
	- Allowing same site requests.
	- Disallowing cross-site `fetch()` and form submission.

## Synchronizer Token

Synchronizer token is the built-in mechanism in a lot of web framework, like .Net, Django and etc. It embed a random token as a hidden field in the submit form, so that server can make the verification when form submitted, to identify the request is allowed.

## Double Submit Cookie

Double Submit Cookie is initialized on client side JS. Client will generate a random token, place it as a hidden field in form, and set as a cookie. And server can then compare these two value to verify its legitimacy.