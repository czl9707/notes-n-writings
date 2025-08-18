---
tags: [network]
title: Linux Network Basic
created_date: 2025-08-16
last_modified_date: 2025-08-16
---

Historically, computer network was highly coupled to physical device. However, as of 2025, Linux and its ecosystem are able to provide every aspect of the network. Within the whole packet processing pipeline of Linux, there are several places it provides hook point for various NAT, filtering.

## Socket Programming

Socket is the fundamental component for network programming in TCP/UDP. It abstract away the TCP handshake and packets error recovery aspects of low level network engineering.

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

## Network Devices

Related tools to inspect or modify the network devices:

- `ip link show`
- `ip link add`
- `ip link delete`
- `ip link set`

### ETH

`eth` is the basic network devise in Linux. It can represent the actual network port on NIC (Network Interface Card), and can also represent a virtual equivalent.

### Bridge

`bridge` is a software switch inside the Linux kernel. As its name, it can connect different interfaces, both physical and virtual. Without the help of bridge, interfaces, such as `eth` created using `ip link add`, wouldn't be able to talk to each other.

### VLAN

`vlan` (Virtual LAN) is a virtual interface for other "physical" interface (can be `eth`, `gre`, `bridge` and etc.). One use case would be creating multiple `vlan`s out of same physical interface, to have multiple applications using same physical interface underneath.

### GRE Tunnel

`gre` (Generic Routing Encapsulation) wraps a point to point network communication into a network interface. One way to understand this is that, it is a alias of sending packets from device A to device B, with a interface C exposed as a shotcut.

## Software-defined Networking

Using a distributed manner to control routing usually create a black box topology, and sometime will create some network bottleneck, since it's impossible for a single router to have full picture of the entire topology. **Software-defined Networking** takes advantage of Linux's capability to perform routing, and uses a centralized control plane to manage network in a more efficient way (in some situation).

## Tools & Libs

- [Container Lab](https://containerlab.dev/) for setting up [container](as/developer/notes/container.md) environment for network experiment.
- [Scapy](https://scapy.net/) Python library for inspecting packets.
- `ping`
- `tshark` CLI version of `wireshark`
- `iproute2` & `net-tools` both of them are a collection of networking utilities for Linux.
