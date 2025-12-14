---
title: Load Balancing
tags: [network]
created-date: 2025-12-11T22:48:28-05:00
last-updated-date: 2025-12-13T18:30:53-05:00
---

A load balancer serves as the point of entry for a service, and directs traffic to one of N servers that can handle the request.

In context of modern software development, load balancer almost is a must for pretty much everything, whenever there is some multi-tenancy behavior, there is some kind of balancer required.

## Layers

Load balancing can happen on both [Layer 4](note/by/developer/computer_network_basic.md#Layers%20of%20Computer%20Network) and [Layer 7](note/by/developer/computer_network_basic.md#Layers%20of%20Computer%20Network), which is usually corresponding to TCP/UDP and HTTP layer. While Layer 4 load balancing has a better performance, Layer 7 load balancing has access to application specific information such as HTTP headers, which grants more flexibility.

## Server Set & Flow Affinity

Two major consideration while performing load balancing:

- **Server Set**: Which server should the packet go to in the first place?
- **Flow Affinity**: Should following packets should go to the same server?

## Routing Algorithm

Based on the requirements, some popular routing algorithm:

- **Round-robin**: Requests are distributed to application servers in rotation.
- **Weighted Round-robin**: Similar to Round-robin, but it considers the characteristics of each request or server, by assigning them weights, so that requests can be distributed more fairly.
- **Least Connections**: A new request is sent to the server with the fewest current connections to clients.
- Least Bandwidth: This method measures traffic, sending client requests to the server with the least bandwidth of traffic.
- Source Hashing: Distributes requests based on a key we define, such as the client IP address or the request URL, and this is the only method to maintain [Flow Affinity](#Server%20Set%20&%20Flow%20Affinity).

## Redundant Load Balancer

One single load balancer become a single point of failure. The solution is rather simple. Just have multiple of them.

Extra instances of load balancers can work as backup or work together. If flow affinity is required in such cases [Consistent Hashing](note/by/developer/consistent_hashing.md) is required here.

## More than Just Load Balancing

A load balancer's main job is to distribute the requests to the server instances hiding behind it. However, taking advantage of where it stands, it can do more than just handing requests and response.

 - **Health Checks**: Removing the server from the server pools if determining it is no longer healthy.
 - **Sticky Session**: Forwarding all requests from the same source address to the same server, if the server is not stateless.
 - **HTTPS Termination**: Decrypting requests and encrypting responses for the real servers behind instead letting them do this.
 - **Compression**: Response compression.
 - **Caching**: [Caching](note/by/developer/caching.md) static responses.
 - **Logging & Tracing**: Tracking all requests and response for debugging purpose.
 - **Redirect & Rewrite**: Pushing [routing](note/by/developer/web_routing.md) behavior closer to user.
 - **Error Handling**: Delivering fallback error response.

## Solutions

- [Nginx](note/by/developer/drafts/nginx.md)

