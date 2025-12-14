---
title: Caching
tags: [system-design]
created-date: 2025-12-13T18:26:12-05:00
last-updated-date: 2025-12-13T23:06:11-05:00
---

Cache is an extremely simple concept, which literally just keep part of data handy for faster retrieval. Therefore, cache usually keep subset of data in a faster storage from the slower storage.

Cache is everywhere, a lot of computing infrastructures utilize caching mechanism, such as [CDN](note/by/developer/content_delivery_network.md), [DNS](note/by/developer/domain_name_server.md) and etc. It even exist in hardware, in CPU, RAM and etc.

## Caching Strategies

> There are only two hard things in Computer Science: cache invalidation and naming things.
> -- Phil Karlton

Interacting with cache has two parts, read and write. Both of read and write has established common patterns.

### Lazy Read

This might be the most common and handy way of cache reading. Read access to cache and storage both live in application. The pattern simply read from cache, return if **cache hit**. Read from storage if **cache miss**, store a copy in the cache and then return it.

``` python
def fetch_data():
	data = get_from_cache()
	if not data:
		data = get_from_db()
		save_to_cache(data)
	return data
```

### Read Through

Different from [Lazy Read](#Lazy%20Read), application **only** interact with cache for read. Therefore, cache acts like a unified data storage, handling the data fetching on **cache miss**, while the fetching logic is hidden from application.

### Write Through

Application writes data in both cache and storage. The write operation is only considered as finished when sub operations are finished.

- **Write Through** pattern prioritizes **data consistency**, since data is synchronized all the time.
- Write operation has a relatively **high latency**.
- **Write Through** patter is a good fit when updating critical data where stale data is not acceptable.

### Write Behind

Aka. **Write Back**. Similar to [Read Through](#Read%20Through), application only interact with cache when writing data. Cache acknowledge the write operation immediately, and write back to storage **asynchronously**. Cache may wait for a short delay or doing some update when interacting with storage.

- **Write Behind** prioritizes **Write Performance**.
- Significantly improving the performance when there are some key are write heavy, such as counters, social media *"likes"* and etc.
- Having a risk of data lose if cache instance crash, where "staged" updates are lost.

### Write Around

Application only writes to storage, completely by pass the cache. This prevent the low hitting data from polluting the cache.

- **Write Around** fits the a write heavy scenario, where write operation is pretty scattered, and some level of stale data is acceptable.
- The read operation might have a higher latency, if the key is re-read immediately after write.

## Eviction Policies

Some of the common cache eviction policies:

- **First In First Out (FIFO)**: The cache evicts the first block accessed first without any regard to how often or how many times it was accessed before.
- **Last In First Out (LIFO)**: The cache evicts the block accessed most recently first without any regard to how often or how many times it was accessed before.
- **Least Recently Used (LRU)**: Discards the least recently used items first.
- **Most Recently Used (MRU)**: Discards, in contrast to LRU, the most recently used items first.
- **Least Frequently Used (LFU)**: Counts how often an item is needed. Those that are used least often are discarded first.
- **Random Replacement (RR)**: Randomly selects a candidate item and discards it to make space when necessary.

## Multiple Layer Cache

It is fairly common to have multiple layers of cache, where the layer closer to application will have shorter TTL (time to live) and a smaller subset of data.

## Distributed Cache

Caching system are usually key-value store solutions. One beautiful aspect of key-value store is the key can be hashed and then distributed to multiple nodes (machines). By doing so, the cache system is no longer limited to single node, taking advantage of memory and resources of multiple nodes.

## Common Cache Problem

One "success" indicator for a cache system is the **cache hit rate**, and one responsibility of it is protecting the lower level of storage from heavy traffic. However in some edge cases, traffic can sneak through cache layer and give storage a hard time.

### Cache Penetration

Cache Penetration refers to application attempting to access a non-existent data frequently, it keeps resulting in cache miss, and keeps hitting underlying storage, which creates a huge load.

- Solution is fairly simple, cache the non-existent entry with some placeholder value.

### Cache Avalanche

When a big amount of cache entries expire simultaneously or within a short time window, all requests to different cache missed entries are forwarded to underlying data store. This usually due to the cache entries were put at same time with same TTL.

- **Random/Staggered TTL**: There might be different way of implementation of this. The key idea is avoiding have same TTL for all keys. So that they are less likely to expire at the same moment.

### Cache Stampede

Also known as thundering herd. This refers to a sudden influx of requests overwhelms the underlying system, which is similar to [Cache Avalanche](#Cache%20Avalanche) to some extent.

This can happen due to various reasons, such as cache misses on popular items, a sudden spike in user traffic, or service restarts after maintenance. In worst cases, if one cache node crashes due to some extreme popular keys, if those keys got re-hashed to a different node, then crash again, eventually lead to a system-wise incident.

- [Consistent Hashing](note/by/developer/consistent_hashing.md) can be used to help distribute keys evenly across nodes, to reduce the impact of cash node failing.
- **Circuit breakers** and **rate limiting** help limit the impact of cache node crashing by disabling some extreme popular keys.