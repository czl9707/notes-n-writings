---
tags: [linux, network]
title: Linux Network Basic
created_date: 2025-08-16
last_modified_date: 2025-08-24
---

Historically, computer network was highly coupled to physical device. However, as of 2025, Linux and its ecosystem are able to provide every aspect of the network. Within the whole packet processing pipeline of Linux, there are several places it provides hook point for various NAT(Network Address Translation), filtering.

## Network Devices

Related tools to inspect or modify the network devices:

- `ip link show`
- `ip link add`
- `ip link delete`
- `ip link set`

### ETH

`eth` is the basic network devise in Linux. It can represent the actual network port on NIC (Network Interface Card), and can also represent a virtual equivalent.

### VETH

`veth` (virtual ethernet) pair have the same behavior as a network cable with two ends. Whatever packet goes into one end instantly comes out the other. `veth` always got created in interconnected pairs

### Bridge

`bridge` is a software switch inside the Linux kernel. As its name, it can connect different interfaces, both physical and virtual. Without the help of bridge, interfaces, such as `eth` created using `ip link add`, wouldn't be able to talk to each other.

### VLAN

`vlan` (Virtual LAN) is a virtual interface for other "physical" interface (can be `eth`, `gre`, `bridge` and etc.). One use case would be creating multiple `vlan`s out of same physical interface, to have multiple applications using same physical interface underneath.

### GRE Tunnel

`gre` (Generic Routing Encapsulation) wraps a point to point network communication into a network interface. One way to understand this is that, it is a alias of sending packets from device A to device B, with a interface C exposed as a shortcut.

## Network Namespace

Namespace is meant for isolation. Each namespace gets its own set of tables, routing tables, ARP tables and etc. When processes got started, they inherit the same namespace from their parent.

`ip netns add | attach | del | set` can be used for namespace operations.

Network namespace is a struct in Linux kernel, and the kernel expose the struct at `/proc/<pid>/ns/net`, where `pid` is the process bound to the namespace, or more accurately, the file is a reference to the network namespace the current process binding to.

While `ip netns` rely on `/var/run/netns/<nsname>` instead of `/proc/<pid>/ns/net`. One reason is namespace will be recycled if no process binding to it, which is exactly what happened when it got created by `ip netns` in the first place, a handle file `/var/run/netns/<nsname>` is necessary to keep it alive.

## Tools & Libs

- [Container Lab](https://containerlab.dev/) for setting up [container](note/by/developer/container.md) environment for network experiment.
- [Scapy](https://scapy.net/) Python library for inspecting packets.
- `ping`
- `tshark` CLI version of `wireshark`
- `iproute2` & `net-tools` both of them are a collection of networking utilities for Linux.
- `iptables` for classification, NAT, filtering.
- `tc` (traffic control) for queueing discipline.
- `ipvsadm` for load balancing.

## Linux as End Host

Application can run on Linux and make itself by using Socket.

### Socket Programming

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

## Linux as Router

While the industry moving towards the idea of [Software Defined Network](note/by/developer/computer_network_basic.md#Software%20Defined%20Network), a lot of routers running in cloud environment are replaced with Linux server.

### How To? By Using `iproute2`

- `ip link` for operations related to virtual network devices.
- `ip addr` for operations related to IP addresses of devices.
- `ip route` for operations related to routing tables.
	- `ip route add 10.10.10.0/24 dev eth0` means for packets towards `10.10.10.0/24`, route to `eth0`.
- `ip neigh` for operations related to ARP tables.
	- `ip neigh add 192.168.1.1 lladdr 00:11:22:33:44:55 dev eth0` means on `eth0`, map `192.168.1.1` MAC address `00:11:22:33:44:55`

## Linux as Gateway

The gateway is something that sits at the edge of a network and provides some functionality beyond routing and forwarding, Including filtering, NAT (network address translation), load balancing, rate limiting and etc.

### Filtering & Address Translation

Simple match and action rules. If matching src/dest IP address, port, then drop or allow.

Address Translation is fairly useful:

- **Static Mapping** - Static map Internal IP address to External one, to have application have different internal and external IP address.
- **Dynamic Mapping Single External IP** - Share a Single IP address among many devices.
- **Port Forwarding** - Expose a server running on private IP to public.

#### Using `iptables` for Filtering & Address Translation

`iptables` have a set of concept of `Tables`, `Chains`, `Rules`. Each `table` contains a number of built-in or user-defined `chain`s. Each `chain` is a list of `rule`s which match a set of packets, representing a hook point Linux provide. A `rule` is a matching rule and corresponding action.

There are four available tables:

- **Filter** has chains `INPUT`, `OUTPUT`, `FORWARD`
- **Nat** has chains `PRE-ROUTING`, `INPUT`, `OUTPUT`, `POST-ROUTING`
- **Mangle** has all.
- **Raw** ??

`iptables -t filter -A FORWARD -m state ESTABLISHED,RELATED -j ACCEPT` means, add a rule to `filter` table `FORWARD` chain, `ACCEPT` packets match state `ESTABLISHED` or `RELATED`,

### Load Balancing

A load balancer serves as the point of entry for a service, and directs traffic to one of N servers that can handle the request.

Load balancing can happen on both [Layer 4](note/by/developer/computer_network_basic.md#Layers%20of%20Computer%20Network) and [Layer 7](note/by/developer/computer_network_basic.md#Layers%20of%20Computer%20Network), which is usually corresponding to TCP/UDP and HTTP layer. While Layer 4 load balancing has a better performance, Layer 7 load balancing has access to application specific information such as HTTP headers, which grants more flexibility.

Two major consideration while performing load balancing, **Server Set** and **Flow Affinity**. Which server should the packet go to in the first place, and following packets should go to the same server. Some popular routing algorithm:

- Source Hash
- Round Robin
- Least Connections

#### Using `ipvsadm` for Load Balancing

**IPVS** (IP Virtual Server) is an implementation for Layer 4 load balancing inside Linux Kernel.

`ipvsadm` is been used to set up and maintain IP virtual servers. In `ipvsadm` context, `service` means instance running behind LB, `server` means LB itself. Minimal Example to set up a LB on `123.123.123.123:80` and route to `127.0.0.1:8080` and `127.0.0.1:8081`.

``` bash
ipvsadm -add-service -tcp-service 127.0.0.1:8080 --scheduler rr
ipvsadm -add-service -tcp-service 127.0.0.1:8081 --scheduler rr
ipvsadm -add-server -tcp-service 127.0.0.1:8080 --real-server 123.123.123.123:80 -masquerading
ipvsadm -add-server -tcp-service 127.0.0.1:8081 --real-server 123.123.123.123:80 -masquerading
```

When service responding, two options available, via the LB, or bypassing the LB. Bypassing LB known as **DSR** (Direct Server Return).

### Quality of Service

**QoS** (Quality of Service) refers to the overall performance of a service, in terms of bandwidth, latency, jitter, loss and etc.

- **Classification** - Inspecting packets to identify what class of traffic they belong to, and place it into a queue representing a traffic class.
	- For example, email goes to low priority, web request goes to medium priority and etc.
- **Shaping** - Ensuring a given class of traffic conforms to desired properties such as rates. Two major purpose are controlling traffic rate and controlling burst rate.
	- **Token Bucket**: Tokens can be added to a bucket at rate $R$, the bucket have size $B$. Packet can only be transmitted when there are tokens inside bucket.
- **Scheduling** - Determining which packet to transmit next and which packets to drop.
	- Given a queue that is starting to fill up, determine what/when to drop.
	- Given multiple queues, determine which packet to transmit next.

#### Using `tc` to Perform QoS

Several key constructs in `tc`:

- `qdisc` (Queuing Discipline)
	- Every network interface by default have an ingress and egress `qdisc`.
	- `qdisc`s can be classless and classful, classless means the `qdisc` work by itself, while classful means it should have children
	- Several classless `qdisc` types: `pfifo_fast`, `TBF` (Token Bucket Filter), `SFQ` (Stochastic Fairness Queueing), `RED` (Random Early Detection)
	- And classful `qdisc` types: `HTB` (Hierarchical Token Bucket), `PRIO` (Prioritized), `MQ` (Multi-Queue).
	- `tc qdisc add | delete | replace | ...  dev <dev_name> ( parent <id> | root ) [ handle <id> ] <qdisc_type type_specific parameters>  `
- `class` - the construct that contains inner `qdisc`s for classful `qdisc`.
	- `tc class add | change | replace | delete | show | ... dev <dev_name> parent <id> [ classid <id> ] qdisc <qdisc_type type_specific parameters>`
- `filter` - the construct that classifies traffic into `class`es
	- `tc filter add | change | replace | delete | show | ... dev <dev_name> ( parent <id> | root ) [ handle <id> ] protocol <protocol> prio <priority>`