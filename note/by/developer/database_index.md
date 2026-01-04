---
title: Database Index
tags: [database]
created-date: 2025-12-29T08:17:36-05:00
last-updated-date: 2026-01-04T15:38:35-05:00
aliases: [Index]
---

## How Database Store Data on Disk?

[Relational Database](note/by/developer/database_basic.md#Relational%20&%20Non-Relational%20Database) is a very good abstraction layer on top of underlying physical disk space. It is so good that we sometime forget that it is actually still working with a **file system**.

Databases organize data into **pages (or blocks)** of a fixed size (typically 4KB, 8KB, or 16KB), which are the units the DBMS reads and writes to disk. Reading from disk is the slowest part of the stack, so the DBMS tries to minimize these I/O operations by loading entire pages into a **buffer pool** (an in-memory cache). Without any data structure to help, retrieving specific data would require a **sequential scan (full table scan)**, where the database reads every single page from disk to find matching results.

Indexes are separate data structures stored on disk that act like a "table of contents". They store a subset of a table’s columns, organized to point directly to the physical location of the actual data (tuples) so the DBMS can find them without scanning the whole table.

## Index Structure

When building an index, you specify one or more columns as the **search key**. The index keeps these keys in a **sorted order**, allowing the DBMS to use efficient search algorithms. By using a [tree-like data structure](#B%20Tree%20&%20B+%20Tree), the database reduces search complexity from $O(n)$ to $O(\log n)$.

As mentioned above, each index is a "sorted version" of the table, so the order of search keys in a composite index is crucial for query performance, If a query implies using these columns in different order, the index cannot be fully leveraged.

Note for each index created, the index should be kept up-to-date during write operation, Meaning each write operations are require to update indexes containing the updated column. Therefore, too many indexes built upon a frequently updated column might hurt write performance.

### B Tree & B+ Tree

Modern databases almost always use **B+ Trees**, not the original **B Trees**. The primary difference is where the data (values) is stored:

- **B-Trees:** Store both **keys and values** in every node (root, internal, and leaf). This "wastes" space in the routing nodes, meaning fewer keys fit per page and the tree grows deeper.
- **B+ Trees:** Store values/pointers **only in the leaf nodes**. The internal nodes store only keys and act as "guide posts" to route the search.

![BTree](Media/BTree.svg)

B+ Trees offers several benefits over B Tree:

1. **Shallower Trees:** Since internal nodes don't store values, they can fit many more keys per page, which keeps the tree "short" and reduces the number of disk reads.
2. **Range Scan Efficiency:** Leaf nodes are linked together (like a **doubly-linked list**). Once you find the starting key, you can just traverse the leaves horizontally to get a range of data instead of bouncing back to the root for every key.
3. **Predictability:** Every search for a key always takes the same number of steps because all leaf nodes are at the same depth.

### Scan & Seek

**Index Seek** is a targeted search where the DBMS starts at the root and follows a specific path down to the leaf node. It is used for finding specific values or the start of a range.

**Full Table Scan (Sequential Scan)** is the worst scenario can happen, the database gives up on indexes and reads the entire table file page-by-page. This usually happens when no usable index exists or if the query filter is not selective enough.

**Index Scan** is very similar to **Full Table Scan**, except it scans an index instead of table directly. It is still bad, but relatively faster than full table scan, since the index contains fewer columns, meaning fewer pages to scan through.

## Clustered & Non-Clustered Index

If Indexes require specifying search key, and most tables have primary key, why store table separately?

**Clustered Index** has table data itself physically stored on disk in the **same order** as the index. There can be **only one** clustered index per table. In many systems, the table _is_ a B+ Tree, where the leaf nodes contain the actual row data. Primary keys are usually clustered by default.

**Non-Clustered Index** is a separate structure that lives outside the table. It contains the indexed columns and a **pointer** back to the actual row.

## Dense & Sparse Index

- **Dense Index:** Has an index record for **every single row** in the table.
- **Sparse Index:** Only contains entries for **some of the records**.
