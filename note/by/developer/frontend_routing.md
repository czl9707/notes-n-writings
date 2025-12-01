---
title: Frontend Routing
tags: [frontend, web-dev]
created-date: 2025-09-07T11:51:58-04:00
last-updated-date: 2025-10-19T15:02:17-04:00
---

## Redirection

Server can send a [HTTP](note/by/developer/network_protocols.md#HTTP) 302 response to redirect the client browser to visit another site. This is extremely useful when:

- The content got moved to another url, and to prevent the original one become invalid, server can redirect user to new spot
- Two step authentication, such as [OAuth2](note/by/developer/oauth2.md).
- Error Handling or directing user to authenticate them self.

### Static Redirection

Redirection can also happened without a web server. By setting a [meta refresh](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta#setting_a_page_redirect) in html head, browser can redirect by itself without the requirement of a 302 response code.

``` html
<meta http-equiv="refresh" content="3;url=https://www.mozilla.org" />
```

## Rewrite

Rewrite happens outside of browser. It literally means alternating HTTP request on the fly, can be the proxy, reverse proxy, something hosted on [CDN](note/by/developer/content_delivery_network.md) edge runtime, even the webserver itself. Any part of the request can be rewrote, source, destination, path, headers and etc.

## Server Routing

Server pretty much means a routing behavior having remote server involved. However, there are multiple ways the server can serve the website.

- Statically serving filesystem based contents.
- Webserver dynamic render contents for different routes.

## Client Routing

On contrast to server routing, client routing happens purely on browser. The website does not use `<a href="..."/>` for routing, but update the path inside browser, to trigger some JavaScript behavior. The word **Single Page Application (SPA)** in framework like **React** and **Vue** means exactly this.