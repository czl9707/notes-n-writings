---
title: Network Protocols
tags: [network]
created-date: 2025-08-16
last-modified-date: 2025-08-17
---

## IP

- **IP** stands for "Internet Protocol"
- Best Effort only.
	- Delivery - Packets may get dropped
	- Timing - No guarantee on how long it takes to deliver a packet.
	- Order - Packets may get re-ordered in the network.
- Interfaces on both ends should be assigned with IP address, either IPv4 or IPv6.
	- IP addresses usually come with subnet mask, `#.#.#.#/16` means all the address with the first 16 bits same as the address.
- IP defines header structure, where source and destination address is specified.
- Additionally,
	- Using Longest Prefix to match the destination interface inside the routing table during routing.
	- For a single router, there are usually multiple ingress and egress interfaces. There are multiple priority policy available, round robin, weighted priority and etc.
	- Packets forwarding and packets routing take time. Packets might be dropped when congestion happens.

## TCP

- **TCP** stands for "Transport Control Protocol".
- TCP provides an abstraction of reliable in order stream. It maintains the packets in order, and requests for retransmission if packet lost detected.
- Packet header have:
	- `src IP`, `dest IP`, `src Port`, `dest Port` to identify the connection. Which allows multiple applications to run on the same NIC.
	- `Sequence Number` to keep track of which bytes is the datagram located in the stream.
	- `Acknowledgement Number` specifies what is the next byte in the stream receiver expects.
	- If the `Acknowledge Number` keep not matching `Sequence Number` sent, client will re-send un-acknowledged bytes.
	- `Window Size` indicates how many bytes the host is currently able to receive.
- Three way Handshake:
	- Client Send `SYNC`
	- Server Send `ACK SYNC`
	- Client Send `ACK`
- Network transmission should keep the balance of fair and efficient, not sending any datagram until previous datagram got `ACK`ed is very un-efficient.
	- Adjusting Congestion Window, is a way to "predict" the network round trip time.
	- Additive Increase: For each round trip, the number of packet increase additively.
	- Multiplicative Decrease: Halve the number of packet sent in one shot if any packet loss happen.

## ICMP

- **ICMP** stands for "Internet Control Message Protocol".
- Primarily used for sending error messages and operational information. The protocol header includes a TTL field, which is used for tools like `ping` and `traceroute` to inspect network topology.

## OSPF

- Link-state protocol used for Intra-domain routing.
- During broadcasting, routers exchange everything they know about the domain. Repeat broadcasting using updated knowledge, until converge.
- Each router would know the entire domain topology after the broadcast converged.
- Each router use shortest path (Dijkstra) to route packets.

## BGP

- Path-vector protocol used for inter-domain routing.
- **BGP** stands for "Border Gateway Protocol".
- During broadcasting, routers only exchange the information about the node they can reach both directly and indirectly, not the topology.
- Each router would only keep the information about their neighbors after broadcasting converged.
- Each router route packets based on local optimal, which can be least hop, local preference, external over internal and etc.

## ARP

- **ARP** stands for "Address Resolution Protocol".
- ARP is used for mac address resolution, not IP address.
- Router broadcast the IP address it is looking for, and neighbor link response with its MAC address if it has the IP address.

## DHCP

- **DHCP** stands for "Dynamic Host Configuration Protocol".
- Once upon a time, we need to setup IP address when getting network access. DHCP is essentially removing the requirement of having a fixed IP address for each device.
- When client connect to network, client broadcast to request a IP address. DHCP server will respond with a IP address offer. Client again pick a IP address and request for that. Server respond with an ack message.

## DNS

- **DNS** stands for "Domain Name Server".
- IP addresses are human un-readable, domain name is much more friendly, DNS perform the domain name to IP address(es) translation.
- Domain is named in a hierarchical way, starting from the end, every segment is a layer, and may or may not have has its own Name Server to resolve address.
- When configuring DNS Records:
	- `Type A` is a domain, IP address pair.
	- `Type NS` specifies the hostname of authoritative name server for this domain.
	- `CName` is an alias for another domain.
- DNS Records are stored distributed across global, a DNS lookup will involve multiple Name Servers.
	- Starting from local DNS server, it point the lookup to root DNS server if no information about the domain is known.
	- Root Server will point it to top level Name Server, for example the one for `.com`, `.org`.
	- And then keep doing this until the full domain name got resolved.
- One domain might be resolved into multiple IP addresses.

## HTTP

- Web application-layer protocol.
- Message format:

	``` bash
	START_LINE <CRLF>
	MESSAGE_HEADER <CRLF>
	<CRLF>
	MESSAGE_BODY <CRLF>
	```

	- Start line for request `Method Path Version`.
	- Start line for response `Version Status_Code Status_Text`
- Methods: `OPTIONS`, `GET`, `POST`, `PUT`, `DELETE`, `HEAD`, etc.
- Message content format can be arbitrary, HTML, JSON, XML and etc.
- `HTTP/2.0` multiplexed requests comparing to `1.*`, requests to same host can share connection, saving handshakes.

## HTTPS

- Essentially HTTP over [TLS](note/by/developer/network_security.md#TLS).

## gRPC

- **RPC** stands for "Remote Procedure Call". It is a concept, without specifying implementation detail.
- `gRPC` is a implementation for it.
	- Based on protobufs - a binary format to serialize data, faster than string serialization.
	- HTTP/2.0 based.