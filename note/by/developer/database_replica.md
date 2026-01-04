---
title: Database Replica
tags:
  - database
  - system-design
created-date: 2025-12-28T20:33:36-05:00
last-updated-date: 2025-12-29T08:17:42-05:00
aliases:
  - Replica
---

## Problem Statement

When all data is stored in a single place, this becomes a single point of failure. To avoid such issue, the solution is simply replicating data in multiple [databases](note/by/developer/database_basic.md). By doing so, the reliability, fault-tolerance, or accessibility of the application is increased.

## Master-Slave Replication

There will be only one master node in this strategy. **The master node serves reads and writes, slave nodes only serve read**, and write operation are replicated to all slave nodes.

The system can continue to operate in **read-only** mode after the master fails. To serve write operations, a master node should be brought up, either by promoting a slave or provision a new one.

**Master-Slave Replication Strategy** offers a relatively easy way to manage replicas, with some risk of data loss during master failure. And it still has a single point of failure for write operations.

## Master-Master Replication

All nodes are master nodes, handling read and write. **Master-Master Replication Strategy** is hard to manage. Since the data flows in both directions, it is extremely crucial to handle write conflicts (concurrent write on same data record). Taking this into consideration:

- It either give up some data consistency across nodes, to allow write operations commit on one node and sync the other master asynchronously,
- Or strictly sync up both nodes on write operations, but sacrifice latency of write operations.

## Synchronous Vs Asynchronous Replication

**Synchronous Replication** commits write operation after data persisted in both place, so that the primary copy and the replica should always remain synchronized.

**Asynchronous replication** commits write operation after data persisted to the target db. It is very common for the replication process to trigger on a scheduled basis to reduce computation costs.
