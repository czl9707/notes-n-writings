---
title: Cloud Network Infrastructure
tags: [cloud, network]
created-date: 2025-08-22T00:00:00-04:00
last-updated-date: 2025-08-25T00:00:00-04:00
---

## Problem and Challenge

Net work fabrics inside datacenter has a much busier traffic comparing to network outside.

The cloud providers start with a quite traditional hierarchical network fabric initially. Server connect to ethernet switches, ethernet switches(covering subnets) to access router(covering intra-datacenter, inter-subnet traffic), access router(internet router covering inter-datacenter traffic) to core router.

- Traffic patterns are highly volatile and highly unpredictable:
- Amount of network traffic from server to server is limited.
- Having a high dependency on high-cost proprietary internet routers.
- Distributed resource fragmented a lot, leading to unnecessary internet router level traffic.

## Flat Addressing and LSA

Different from the network infrastructure in public Internet, which is required to be highly dynamic and autonomous, network infrastructure in cloud can be built in a more controlled way. The layer topology is redundant, we only need the illusion of a huge [Layer 2](note/by/developer/computer_network_basic.md#Layers%20of%20Computer%20Network) switch for all network traffic.

**VL2**[^1] utilized flat addressing and **LSA**(Location Specific Address) to achieve this. Instead of relying on subnetting and layers of router to resolve the location, a directory service is included to resolve location directly. The hierarchical switch structure is got replaced with a layer of Top-of-Rack (ToR) switches.

When sending packets, source server resolve the destination location by querying the directory service, which has all the server and their IP information associated. Then forwarded the packets with the destination ToR and IP information as a header to the destination ToR via the local ToR.

## Valiant Load Balancing

Due to the scale of the infrastructure, intermediate layer of router will be replicated, which brings another problem. Router traffic pattern changed in seconds, one router will get flooded, and "redirect" traffic to others, where packets lost is pretty often.

**VL2** solving this by using **Valiant Load Balancing (VLS)**, which is really just randomly forwarding packets from ToR to intermediate router regardless of router state. **Randomization can tame volatility.**

## Google Andromeda

**Google Andromeda**[^2] is the **Software-Defined Networking (SDN)** infrastructure powering the **network virtualization** layer of GCP.

Packet processing on host can take time, especially when all match-action rules are loaded on each host, which makes the data plane scale in quadratic time.

**Andromeda** uses different packet flow processing path for different type of traffic. For those high bandwidth flow, the flow is just processed on host using host NIC queues, and skipping hypervisor layer, which is called "fast path". While those low bandwidth ones and low priority ones are offloaded to "hoverboards", which is are dedicated instance for data plane gateway.

As a result, more than 95% traffic are offloaded from the host to hoverboards.

Andromeda also adopts other techniques for packet processing, such as offload packet inspection to dedicate CPU threads and etc.

## Azure AccelNet

**Azure AccelNet** has a same initiative as [Google Andromeda](#Google%20Andromeda), trying to offload data plane from the VM host itself.

**SmartNIC**[^3] is the specialized hardware adopting the idea of **FPGA(Fields Programmable Gate Array)**. It is designed for high parallelism processing while providing large amounts of programmable gate. It is able to process large amount packets with a good flexibility support, which do a way better job for packet forwarding comparing to CPU.

After trying different CPU data plane solutions, such as rules caching, Azure deployed its specialized hardware for data plane, and offloaded all packets forwarding to it, which saves huge amount of CPU power.

## SWAN

**SWAN(Software-Driven Wide Area Network)**[^4] is mainly focused on increasing the efficiency of inter-datacenter communication. Several observation on the inter-datacenter traffic:

- The traffic is lack of coordination. Some so-called background traffic is not necessary to happen at specific moment, happening in a time range is good enough, example cases includes database backup. These type of background traffic is causing congestion pretty often without coordination ahead.
- Inter-domain protocols such as [BGP](note/by/developer/network_protocols.md#BGP), MLPS, makes decision based on greedy local optimum, which create congestions because it doesn't globally optimize utilization, especially during cases like software upgrade and machine turnaround.

**SWAN** leverage **Software-Defined Networking (SDN)** to control inter-datacenter traffic in centralized manner. A logically centralized controller is developed to:

- Compute optimal allocations for and rate limit those background traffic, in order to avoid the congestion between background traffic and non-background traffic, so non-background traffic and urgent traffic gets priority.
- Proactively re-route traffic away from the router in advance when there is an up coming software upgrade or machine turnaround.

## Google Espresso

**Google Espresso**[^5] focuses on the Peering Edge network, which means the edge where traffic leaves GCP. Instead of relying on the traditional BGP way of edge peering, Espresso decouple the routing decision making from BGP protocol. While maintaining the BGP interface to connect with the routers, the decision is been done internally by using several techniques:

- Hierarchical Control: Centerialized controllers do not make all granular decisions, but just routing traffic to areas.
- Application Aware Routing: Similar to [SWAN](#SWAN), packets routing taking application into consideration, client facing takes priority, background traffic can take sub-optimal path.
- Fail Static: Local router controller will freeze its knowledge of centerialized controllers fail.

Packets can find their way using user optimal path, instead BPG optimal, in another word, packet will leave or enter GCP through a non-BGP optimal edge.

## Google Maglev

**Google Maglev**[^6] is a reliable load balancer design. The challenge Maglev is tackling is the reliability and consistency of network load balancer.

In a high throughput environment, load balancer will has multiple replications, even across different region. Traditional load balancer maintain connection state in its local memory, which will lost for sure after any LB health change, which leads to experience error or packet loss for active connections.

The key innovation of Maglev is its using [consistent hashing algorithm](note/by/developer/consistent_hashing.md) to select service from service pool. By doing so LB is freed from state managing. Any LB can route packets belong to same connection to the same host. Thus, single load balancer health doesn't hurt the overall consistency and reliability.

---

[^1]: [VL2: A Scalable and Flexible Data Center Network](https://www.microsoft.com/en-us/research/publication/vl2-a-scalable-and-flexible-data-center-network/)
[^2]: [Andromeda: Performance, Isolation, and Velocity at Scale in Cloud Network Virtualization](https://research.google/pubs/andromeda-performance-isolation-and-velocity-at-scale-in-cloud-network-virtualization/)
[^3]: [Azure SmartNIC](https://www.microsoft.com/en-us/research/project/azure-smartnic/)
[^4]: [SWAN: Software-Driven Wide Area Network](https://www.microsoft.com/en-us/research/blog/born-in-the-research-lab-a-decade-ago-swan-continues-to-accelerate-networking-in-the-microsoft-cloud/)
[^5]: [Taking the Edge off with Espresso: Scale, Reliability and Programmability for Global Internet Peering](https://research.google/pubs/taking-the-edge-off-with-espresso-scale-reliability-and-programmability-for-global-internet-peering/)
[^6]: [Maglev: A Fast and Reliable Software Network Load Balancer](https://research.google/pubs/maglev-a-fast-and-reliable-software-network-load-balancer/)