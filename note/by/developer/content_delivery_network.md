---
title: Content Delivery Network (CDN)
tags: [cloud, network]
created-date: 2025-08-24T00:00:00-04:00
last-updated-date: 2025-12-28T20:12:32-05:00
aliases: [CDN]
---

**Content Delivery Network (CDN)** is a geographically distributed network of servers that store cached copies of website content closer to users.

When user try access internet resource in other countries or even continents, the internet traffic will go from local network domain all the way up to cross-sea network cable, and come back with all the response. This is necessary for at least the first time, but can be optimized for the following requests.

## Content Caching

- CDN provider creates network with servers at edge and a lot of peering agreements with network providers.
- Content provider signs up with CDN provider and specifies Origin Server.
- Client Requests go to CDN servers.
- If CDN server cannot find contents, it forward requests to the origin server.
- CDN serve cached content for subsequent accesses.

### Push Type & Pull Type CDN

There are two type of CDN in general, and the major difference is then caching strategy.

**Pull Type CDN** works like an application level cache, it caches response from application. While **Push Type CDN** won't cache source server response, instead, resource owner would submit content to CDN.

Therefore, low hit website usually benefits more from push type CDN, since that usually has a longer TTL.

## Live Video Streaming

Traditionally, live video streaming require huge amount of network bandwidth, since server need to send traffic to all users.

But with help of CDN, servers no longer do unicast to perform many point to point transmission, but perform multicast, only talking to one router, and let router to send traffic to multiple endpoint when necessary.

This approach saves huge amount of bandwidth from the server aspect. From users' perspective, they are not talking to streaming server any more, but pulling from CDN edge server instead.

## Application Delivery

Not all content is cacheable, a lot application data is highly dynamic, changing from moment to moment. CDN cannot be used to cache them, but application can still benefit from CDN.

- Path optimization: CDN can allow traffic flow through their private path, which is faster than public Internet.
- Packet loss reduction - CDN network is somewhat more reliable. On top of that, if packet retransmission is required, this can be done in the edge network level, without requiring a full round trip.
- Transport protocol optimizations (e.g., QUIC, HTTP/3 for reusing connection).
- Application optimization (parse and prefetch content)

## DNS Based Load Balancing

One domain can be mapped multiple IP addresses on DNS, CDN can perform load balancing at this level. This can be treated as an alternative to normal [Load Balancer](note/by/developer/cloud_network_service.md#Load%20Balancing).

## Edge Function

Apart from caching, CDN can serve a some functionality closer to user as well. The `middleware` functionality a lot frontend framework provides is actually leveraging this, which is commonly used for request rejection, [redirection](note/by/developer/web_routing.md#Redirection), [rewrite](note/by/developer/web_routing.md#Rewrite) and etc. These operations are light weight and not really have to happen on the source server.