---
title: Cloud Network Service
tags: [cloud, network]
created_date: 2025-08-22
last_modified_date: 2025-08-25
---

Different cloud providers might have different fancy names for their services, but these basic network feature share the same idea.

## VPC

**Virtual Private Cloud (VPC)** is literally a private network running on top of cloud providers physical infrastructure.

The existence of VPC solves problems and provides some benefits.

- Clients won't like their resources being accessible for other clients.
- Clients would like to choose IP address at their freedom, not choosing from the ones left by other clients.

**VPC** is always bound to one [region](note/by/developer/cloud_basic.md#Concepts), and is technically the first cloud infrastructure everyone would have, since everything else should be tied to a VPC when created, otherwise they won't have any network connection in place. Cloud provider usually create one VPC when a root account is being created.

Resources within same VPC would talk to each other using private IP addresses. While it is possible to assign public IP address to some resources and set up correct [Firewall Rules](#Firewall%20Rules) to expose it.

## Subnet

Subnet is a range of IP living inside a [VPC](#VPC). Each subnet live in the same [region](note/by/developer/cloud_basic.md#Concepts) as its parent VPC for sure, and only lives in one [availability zone](note/by/developer/cloud_basic.md#Concepts).

Resources within same subnet is not always able to talk to each other. [Firewall Rules](#Firewall%20Rules) will be applied on top of resources, specifying which traffic to allow or deny.

Cloud (usually) apply a default rule sets when a subnet got created, which allows all traffics between resources within the same subnet. So it feels like resources within same subnet can talk to each other by default.

## Routes & Route Table

Routing table to direct traffic between different subnets and external gateways. A routing table will either bind to a subnet or a VPC based on the cloud provider. A typical routing table record consists of a destination CIDR (`#.#.#.#/##`) and a target object (local VPC, [NAT Gateway](#NAT%20Gateway) and etc.)

## Firewall Rules

Firewall policy configuration for what traffic to block/allow. Different Cloud providers have different name for firewall rules and different ways to manage. AWS use Security Group and Network ACL to manage it per subnet, while GCP just call it Firewall Rule and it is configured per VPC.

## NAT Gateway

NAT Gateway is a public accessible interface for a VPC, it perform NAT(Network Address Translation) at the edge of a network. It allow egress traffic from internal resources to communicate with external resources on the internet or other VPCs without having public IP address setup.

## Internet Gateway

This is required when internal resource having public IP address assigned, and external resources require to access them using their public IP address. **Internet Gateway** simply allow traffic going through, not doing any NAT, which means it allows both ingress and egress traffic.

## Peering Connection

Putting all resources within VPC is almost never sufficient. And having multiple VPCs talking to each other through public network is too expensive, since it is not necessary to have traffic leaving cloud providers.

Peering Connection sets up a private connection between two VPCs. One peering connection is single-directional, thus peering connections almost always go in pairs. Resources within VPCs would use their private addresses to communicate, without setting up public address and expose.

## Load Balancing

Same to the [Load Balancing](note/by/developer/linux_network.md#Load%20Balancing) premise world, cloud provides layer 4 and layer 7 two types of load balancing.

Different from the traditional world, load balancing can be divided into Global and Local two types:

- **Global Load Balancing**: service pool can located in different [region](note/by/developer/cloud_basic.md#Concepts)s.
	- For ingress traffic, it will be routed to the closest instance within the service pool.
	- For egress traffic, cloud provider can choose to handle the traffic to internet closest to source server, or destination device (based on how much you pay cloud providers...).
- **Local Load Balancing**: service pool are all located in same [region](note/by/developer/cloud_basic.md#Concepts).

Innovations around load balancing:

- [Google Maglev](note/by/developer/cloud_network_infrastructure.md#Google%20Maglev)

## Edge Deploy

Edge deploy refers to deploying the software closer to the user, not necessarily always related to cloud environment, but in most cases yes.

One example of exception is in [Machine Learning](note/by/developer/machine_learning_basic.md) domain, model is sometime edge deployed to physical devices. For models for self-driving cars, network latency is fatal. So have the model executed on the vehicle is a much better choice.

But in most cases, web application edge deploy refers to utilizing [Content Delivery Network](note/by/developer/content_delivery_network.md) to serve resources to save request time. 
