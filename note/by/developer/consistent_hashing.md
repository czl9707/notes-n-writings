---
title: Consistent Hashing
tags: [algorithm, system-design]
created-date: 2025-08-25T00:00:00-04:00
last-updated-date: 2026-01-15T23:09:45-05:00
aliases: [Consistent Hashing]
---

Consistent hashing is an algorithm that distributes keys across nodes in a distributed system in a way that minimizes data redistribution when nodes are added or removed.

## Problem with Traditional Hashing

Note, the type of hashing function we are discussing here means fitting the key set into given number of buckets.

- **Uneven Distribution of Data**: Hash function typically put keys into buckets, without guaranteeing an even distribution of keys across buckets.
- **Inflexibility with Changing Number of Bucket**: Either Increasing or decreasing number of buckets requires a redistribution for the entire key set, which typically leads to most of keys moving to a different bucket.

## Hash Ring

**Consistent Hashing** see the entire key set as a circular linked list, with the head connected to the tail. The key space is chunked into `n` pieces evenly (in expectation), where `n` is the current number of buckets. Each bucket would be assigned to a node.

%%TODO diagramming%%
## Failure Tolerance & Scalability

If the node the bucket belongs to goes down, the bucket merge into its successor on the [Hash Ring](#Hash%20Ring). The mechanism avoids rehashing the entire key space.

One other benefit is that, the key distribution over buckets can be nudged by moving the edge of the bucket slightly, to make the distribution more even.

### Virtual Node

While one bucket is assigned to a node, a node can own multiple buckets, or called virtual nodes. Each virtual node owns a continuous key space, but each node with multiple virtual nodes represented will own a un-continuous key space. So when one node goes down, those virtual nodes owned by the node merge into different healthy node, without having one node taking double traffic.