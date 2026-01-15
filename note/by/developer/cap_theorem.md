---
title: CAP Theorom
tags: [system-design]
created-date: 2026-01-14T17:41:07-05:00
last-updated-date: 2026-01-14T21:06:47-05:00
aliases: [CAP]
---

CAP theorem says that a distributed system can deliver only two desired characteristics out of **Consistency**, **Availability**, and **Partition tolerance** (CAP).

## Definition

- **Consistency**: All clients should get same response from the system if they ask same question at the same moment.
- **Availability**: All client should get response from the system all the time.
- **Partition Tolerance**: If a network partition happens in the system, meaning one part of the system cannot talk to the other, the system can still operate in some way.

### CA System

A CA system cannot suffer from any internal network outage, it would stop working immediately. But whenever it works, it always give with consistent response.

Since [Network](note/by/developer/computer_network_basic.md) is never reliable in our physical world, **Partition Tolerance** is mandatory for most of systems. So CA system isn't that common.

### CP System

CP Systems prioritize Consistency. When network outages happen, the system will keep operating, but will not give answer.

For example, ATM machine will keep working under network outage, but tell user "currently not available".

### AP System

AP System sacrifices consistency. When network outages happen, the system keep responding but might give in-correct answer.

During outages, users can keep interacting with the system, but users on the other of network partition will not able to see the changes.

## PACELC Theorem

PACELC Theorem is an extension of CAP Theorem. It introduces latency as an additional attribute of a distributed system. The key idea is that even when the system is operating without network partition, it still has to trade off between latency and consistency.
