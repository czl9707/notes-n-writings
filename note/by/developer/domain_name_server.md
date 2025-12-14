---
title: Domain Name Server
tags: [network]
created-date: 2025-12-08T18:00:58-05:00
last-updated-date: 2025-12-13T18:29:35-05:00
---

[IP](note/by/developer/network_protocols.md#IP) addresses are human un-readable, domain name is much more friendly, **DNS(Domain Name Server)** perform the domain name to IP address(es) translation. Domains are named in a hierarchical way, each segment is a layer starting from the end, and queries are processed in the similar structure. For example, to query `zane.dev.com`, the order of queries will be `com`, `dev.com`, `zane.dev.com`.

- DNS Records are stored distributed across global, a DNS lookup will involve multiple Name Servers.
	- Starting from local DNS server, it point the lookup to root DNS server if no information about the domain is known.
	- Root Server will point it to top level Name Server, for example the one for `.com`, `.org`.
	- And then keep doing this until the full domain name got resolved.
- One domain might be resolved into multiple IP addresses.

## DNS Servers

DNS Records are stored distributed across global, a DNS lookup will involve multiple Servers of different types.

From the aspect of DNS client there are two types of query, **recursive** and **iterative**, which is primarily controlled by the DNS client. Client can set a **Recursion Desired (RD)** bit in request header to indicate that.

- **Recursive query** means the client only sending one request, the [DNS Resolver](#DNS%20Resolver) giving the resource back by querying recursively.
- **Iterative query** means the DNS Resolver return the location of a nameserver or even root server, then client send query(s) to the location responded iteratively until the resource is resolved.

### DNS Resolver

**DNS Resolver**s are services standing between DNS client and Nameservers. Any query made by DNS client will hit a **DNS Resolver** first. The resolver will try its best to resolve the requested resource record, and there are several possible actions that an resolver can take:

- If the record is already part of its [cache](note/by/developer/caching.md), it return the result right away.
- In a recursive query, it send a request to the [Root Nameserver](#Root%20Nameserver), then to a [TLD Nameserver](#TLD%20Nameserver), finally to a [Authoritative Nameserver](#Authoritative%20Nameserver). If everything went well, with the final IP address in hand, it return it to the client.
- In a iterative query, it return the location of a nameserver closest to the requested resources per its knowledge.

### Root Nameserver

There are 13 **DNS root nameservers** known to every [DNS Resolver](#DNS%20Resolver). Each nameserver has one IP address, but distributed globally, using anycast routing to distribute traffic.

A root server accepts a recursive resolver's query which includes a domain name, and the root nameserver responds by directing the recursive resolver to a TLD nameserver, based on the extension of that domain (`.com`, `.net`, `.org`, etc.).

### TLD Nameserver

**TLD(Top-Level Domain) Nameserver** maintains information for all the domain under the common domain extension, such as `.com`, `.net`.

### Authoritative Nameserver

The **authoritative nameserver** maintains information specific to the domain name it serves, such as `google.com`. When DNS resolver reaches the authoritative nameserver for resolution query, it will give back the IP address if an `A` or `AAAA` record is found. If an `CName` record is found, the alias domain will be returned to resolver, and resolver will have to initialize a new round of look up.

## Record Types

DNS records (aka zone files) are instructions that live in authoritative DNS servers and provide information about a domain. Records includes:

- **A (Address record)**: The record that holds the IP address of a domain.
- **AAAA (IP Version 6 Address record)**: The record that contains the IPv6 address for a domain (as opposed to A records, which stores the IPv4 address).
- **CNAME (Canonical Name record)**: Forwards one domain or subdomain to another domain, does NOT provide an IP address.
- **MX (Mail exchanger record)**: Directs mail to an email server.
- **TXT (Text Record)**: This record lets an admin store text notes in the record. These records are often used for email security.
- **NS (Name Server records)**: Stores the name server for a DNS entry.
- **SOA (Start of Authority)**: Stores admin information about a domain.
- **SRV (Service Location record)**: Specifies a port for specific services.
- **PTR (Reverse-lookup Pointer record)**: Provides a domain name in reverse lookups.
- **CERT (Certificate record)**: Stores public key certificates.

## Reverse DNS Lookup

While DNS lookup refers to resolving IP address(es) from domain name, **Reverse DNS Lookup** refers to resolving domain name from IP address(es). There is no way for the nameserver to know this unless the there are corresponding `PTR` records.

## Subdomains

> To save some money, I put all my website under one domain.
> -- Zane Chen

Subdomain is commonly used to logically split the domain, so different websites can be hosted on child domains under one main domain.

To create Subdomain, `A`, `AAAA` or `CNAME` record is needed. For example, to host my portfolio at `portfolio.my-domain.com`, a `CNAME` record with host as `portfolio` and value point the server is required.
