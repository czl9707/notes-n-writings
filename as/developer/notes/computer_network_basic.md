---
tags: [network]
title: Computer Network Basic
created_date: 2025-08-13
last_modified_date: 2025-08-14
---

Computer Network is built in a layered architecture. And due to the fundamental idea of computer network, granting computers the ability to communicate with each other, each layer of network is designed and built in a distributed way.

## Layers of Computer Network

1. **Physical**: Cables, Wi-Fi radio and etc. The actual media of transmission.
2. **Data Link**: The reliable link between two directly connected nodes. Ethernet and ARP are happening here.
3. **Network**: Layer of routing and addressing. ICMP, OSPF, BGP, IP protocol for pathing finding and IP addressing.
4. **Transport**: Error Recovery & End-to-end delivery. Typically refer to our best friends TCP and UDP.
5. **Session**: Session Management
6. **Presentation**: Formatting, Encryption, Compression. TLS, SSL, JPEG and etc...
7. **Application**: Application specific protocols, HTTP, SMTP, FTP, DNS, DHCP and etc.

## Planes of Computer Network

Other than separating network into granular layers, putting them into "planes" is another way of understanding different components, based on the functionality they perform.

- **Data Plane**: Where packets actually being processed. Major functionalities include forwarding and filtering.
- **Control Plane**: Where packets got routed, defining how data plane should process traffic. Includes different type of routing protocols.
- **Management Plane**: Meant for user or automation software to configure and monitor the two planes above. Including CLI tools, Terraform and etc.

## Packets

Packet is the smallest unit when communicate using network. Since network is built in a layered architecture, packet is also having similar structure. Protocols in each layer define their own headers and ways of representing data, so the packet will header following headers, with payload living in the middle of it. Header usually contains information about the source and destination, size of the payload, some security information about the packet.

## Linux for Computer Network

Historically, computer network was highly coupled to physical device. However, as of 2025, Linux and its ecosystem are able to provide every aspect of the network. Within the whole packet processing pipeline of Linux, there are several places it provides hook point for various NAT, filtering.

### Socket Programming

- TCP Client
	- `Socket()`
	- `connect()` connect to server.
	- Repeating `send()` and `recv()`.
	- `close()`
- TCP Server
	- `Socket()`
	- `bind()` bind to specific port.
	- `listen()` block thread and waiting for incoming connection.
	- `accept()` accept connection.
	- Repeating `recv()` and `send()`.
	- Final `recv()` for EOF notification.
	- `close()`

### Linux Network Devices

#### Bridge

#### VLAN

#### ETH

#### Tunnel

## Tools & Libs

- [Container Lab](https://containerlab.dev/) for setting up [container](as/developer/notes/container.md) environment for network experiment.
- [Scapy](https://scapy.net/) Python library for inspecting packets.
- `ping`
- `tshark` CLI version of `wireshark`
- `iproute2` & `net-tools` both of them are a collection of networking utilities for Linux.
