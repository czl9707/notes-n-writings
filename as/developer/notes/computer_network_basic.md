---
tags: [network]
title: Computer Network Basic
created_date: 2025-08-13
last_modified_date: 2025-08-24
---

Computer Network is built in a layered architecture. And due to the fundamental idea of computer network, granting computers the ability to communicate with each other, each layer of network is designed and built in a distributed way.

## Layers of Computer Network

1. **Physical**: Cables, Wi-Fi radio and etc. The actual media of transmission.
2. **Data Link**: The reliable link between two directly connected nodes. Ethernet and ARP are happening here.
3. **Network**: Layer of routing and addressing. [ICMP](as/developer/notes/network_protocols.md#ICMP), [OSPF](as/developer/notes/network_protocols.md#OSPF), [BGP](as/developer/notes/network_protocols.md#BGP), [IP](as/developer/notes/network_protocols.md#IP) protocol for pathing finding and IP addressing.
4. **Transport**: Error Recovery & End-to-end delivery. Typically refer to our best friends [TCP](as/developer/notes/network_protocols.md#TCP) and UDP.
5. **Session**: Session Management
6. **Presentation**: Formatting, Encryption, Compression. TLS, SSL, JPEG and etc...
7. **Application**: Application specific protocols, [HTTP](as/developer/notes/network_protocols.md#HTTP), SMTP, FTP, [DNS](as/developer/notes/network_protocols.md#DNS), [DHCP](as/developer/notes/network_protocols.md#DHCP) and etc.

## Planes of Computer Network

Other than separating network into granular layers, putting them into "planes" is another way of understanding different components, based on the functionality they perform.

- **Data Plane**: Where packets actually being processed. Major functionalities include forwarding and filtering.
- **Control Plane**: Where packets got routed, defining how data plane should process traffic. Includes different type of routing protocols.
- **Management Plane**: Meant for user or automation software to configure and monitor the two planes above. Including CLI tools, Terraform and etc.

## Packets

Packet is the smallest unit when communicate using network. Since network is built in a layered architecture, packet is also having similar structure. Protocols in each layer define their own headers and ways of representing data, so the packet will header following headers, with payload living in the middle of it. Header usually contains information about the source and destination, size of the payload, some security information about the packet.

## Software Defined Network

Historically, computer network was highly coupled to physical device. Using a distributed manner to control routing usually create a black box topology, and sometime will create some network bottleneck, since it's impossible for a single router to have full picture of the entire topology.

While more and more components and functionality of network are covered by [Linux](as/developer/notes/linux_network.md), the industry moves to Software defined networking, where pieces are decoupled with each other, with a centralized control plane to manage network in a more efficient way (in some situation).

While the industry move towards cloud computing, the [cloud](as/developer/notes/cloud_basic.md) is meant for Software Defined Infrastructure, and so as [cloud network](as/developer/notes/cloud_network_service.md). And in terms of [network infrastructure in cloud environment](as/developer/notes/cloud_network_infrastructure.md), it highly depends on this idea to avoid the black box behavior of traditional network devices, and decouple different pieces.

## Tools & Libs

- [Container Lab](https://containerlab.dev/) for setting up [container](as/developer/notes/container.md) environment for network experiment.
- [Scapy](https://scapy.net/) Python library for inspecting packets.
- `ping`
- `tshark` CLI version of `wireshark`
- `iproute2` & `net-tools` both of them are a collection of networking utilities for [Linux](as/developer/notes/linux_network.md).
