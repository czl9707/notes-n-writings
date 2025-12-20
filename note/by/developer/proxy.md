---
title: Proxy
tags: [network]
created-date: 2025-12-18T08:23:38-05:00
last-updated-date: 2025-12-18T08:51:14-05:00
---

A proxy server is a piece of software sitting between the client and the backend server. It is conceptually very close to [Proxy Pattern](note/by/developer/object_oriented_design_patterns.md#Proxy) in design patterns, if only caring about the job it is doing. 

Depending who it is servering for, proxy can be classified as:

- A Forward Proxy if it is servering clients.
- A Reverse Proxy if it is servering servers.

## Forward Proxy

A forward proxy is a piece of software that sits in front of a zone of client machines. When they make requests to external of the zone, the proxy intercepts those requests and then communicates with web servers on behalf of them. 

During the process of intercepting, it

## Reverse Proxy

### Reverse Proxy & Load Balancer

One common question is the difference between [Reverse Proxy](#Reverse%20Proxy) and [Load Balancer](note/by/developer/load_balancing.md). They both stand in front of server, and delivering request and responses for servers.

Just to understand this conceptually, load balancing is one feature reverse proxy can provide, and reverse proxy can do more than that. Such as requests sanity check, address white listing, request rewrite and etc. And, again, conceptually, if there is only one server behind, it is still a reverse proxy, but no longer load balancer.