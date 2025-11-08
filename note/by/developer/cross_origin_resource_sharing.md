---
title: Cross-Origin Resource Sharing (CORS)
tags: [network, web-dev]
created-date: 2025-10-19T12:29:43-04:00
last-updated-date: 2025-11-04T22:38:04-05:00
---

**Cross Origin Resource Sharing (CORS)** is a mechanism browser use to help improve the user's security during [HTTP](note/by/developer/network_protocols.md#HTTP) communication. The majority implementation is on standard browser, while the backend server need to provide several headers.

The purpose of CORS is to stop JS scripts on malicious sites calling backend API without control. In other word, browser always trust the backend. To achieve this, browser allows API endpoint to specify who can see access and how.

## GET

`GET` request is usually the safest, so browser will send the request regardless. However, the backend can return response with header:

``` bash
Access-Control-Allow-Origin: https://example.com
```

The header can specify multiple domains. If the request is not sent from the domain specified by the header, browser will just discard the response, keeping it away from the script.

## OPTION

Requests like `POST` and `DELETE` are more dangerous, if hit by malicious scripts. To protect backend, browser will send pre-flight request to get the CORS headers first, and only send the request if conditions met.

Browser's pre-flight `OPTION` request:

``` bash
OPTIONS /user
Origin: https://example.com
Access-Control-Request-Method: DELETE
```

Backend response:

```
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: PUT, GET, POST, DELETE
Access-Control-Allow-Headers: X-Auth-Token
```

Then browser will send the `DELETE` request.

## Who is CORS Protecting?

The wording "protecting server" is not quite right. CORS is protecting user from exposing their data to malicious entity. Protecting backend server is the job of backend server it self.