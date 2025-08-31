---
title: Cloud Basic
tags: [cloud]
created-date: 2025-08-22T00:00:00-04:00
last-updated-date: 2025-08-24T00:00:00-04:00
---

## Why Cloud?

### Elimination of an Up-Front Commitment

This definitely comes first out of tons of other reason.

When I first stepping into application development domain, I tried host my little web application on my laptop and tried to expose it to public. Without having much knowledge about different topics in the software engineering, no doubt, I failed very soon. I was not able to figure out how to expose my laptop network to public through my family router. And I was reluctant to have my laptop run 24/7 just for this tiny web application :).

With cloud, we can eliminate a lot infrastructure provisioning and configuration (and avoid using my personal laptop for applications as well).

### Pay as You Go

With fixed capacity provisioned, the actual usage will always either go under or over. This might not be a big deal when the scale is big, but it is really cost-inefficient.

For the small company or individual who might only need handful machine, even less than one machine, cloud's "pay as you go" model is more cost-efficient.

However, on the other hand, "the end goal of cloud computing is let cloud provider get rich". Cloud is not always the solution, company beyond certain scale may benefit more from having their own bare metals and teams to maintain them.

### Ease of Scaling

Cloud providers have enough computation power, they provide more if you pay more, and take some back when you don't need that. And, again, each time we scale up and down, it saves quite some up-front commitment.

### Cost Efficiency

Fragmented public infrastructure usually provided by different providers, and the evolution of public standard usually moves really slow. While cloud, at least the internal structure of cloud, is managed by single organization, upgrades can be applied in a much more faster manner.

Therefore a lot more innovation and "non-standard" technology went into the cloud infrastructure to provide a better cost efficiency from a cloud provider aspect. At mean time, it also mean a better performance from the users' perspective.

- [Cloud Network Fabric](note/by/developer/cloud_network_infrastructure.md)

### Infrastructure in Globe

Just as the title, cloud providers can help developer and application reach global scale pretty easily.

And some technology by default require a distributed infrastructure across the globe, and super hard to manage and build on a small team. Such as [CDN](note/by/developer/content_delivery_network.md).

## Concepts

- **Datacenter** - literally a physical building owned by cloud providers, with servers, networking, storage, and cooling system built in. Users usually do not interact with datacenter directly.
- **Region** - A geographic area (e.g. us-east-1, europe-west-1) which contains multiple zones.
- **Zone** - an isolated datacenter or group of datacenters within a region, some times called **Availability Zone**. Each zone has independent power supply, which meant for avoiding single points of failure. Therefore, user usually utilize multiple zones within a region.

## Cloud Infrastructure Provided

- Service Runtime
- Data Store
- [Network](note/by/developer/cloud_network_service.md)
- DevOps

## Infrastructure as Code

There is no such thing called **Infrastructure as Code (IaC)** before cloud computing having such scale. Managing and Provisioning Infrastructure used to be done in a more bespoken way, button clicks, random scripts, bespoken services, while application development was in a more managed way, such as code review, and version control.

Instead of **Infrastructure as Shell Script** and **Infrastructure as PowerPoint**, **IaC** is introduced to manage infrastructure as the same way manage application.

Tooling:

- [Terraform](https://github.com/hashicorp/terraform)
	- Meant for Provisioning infrastructure using HashiCorp Configuration Language with local `.tfstate` file as state management.
- [Pulumi](https://github.com/pulumi/pulumi)
	- Meant for Provisioning infrastructure as well, but using programming language like Python, JS, C#. State management is done in cloud (or self hosted).
- [Ansible](https://github.com/ansible/ansible)
	- Meant for software deployment, package installation and configuration management after infrastructure already provisioned. Using YAML and Jinja template.
	- Agent-less, SSH based, easy to get start with, but not good at scaling.
- [SaltStack](https://github.com/saltstack/salt)
	- Very similar to Ansible.
	- Following master and minion pattern, need to set up master before started. More efforts to manage, but scales well in enterprise level infrastructure.