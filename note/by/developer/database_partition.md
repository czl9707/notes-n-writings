---
title: Database Partition
tags: [database, system-design]
created-date: 2026-01-14T22:40:36-05:00
last-updated-date: 2026-01-14T23:00:56-05:00
---

Partitioning is a design technique to provide better scalability in [database](note/by/developer/database_basic.md). The problem statement is fairly simple, the table become too large to manage.

## Vertical Partitioning

There are cases that tables grow horizontally, one table can contain hundreds of, even thousands of column. This hurt performance badly, since more columns means more [Index](note/by/developer/database_index.md)es, and slower scanning.

The solution is split the table into multiple, with each containing same amount of records but different non-overlapped set of columns. Records in different table share primary key.

## Sharding

Horizontal Partitioning also called Sharding. It splits table into multiple ones with same schema.

There are many different way of defining the partition criteria:

- Hash based, or better with [consistent hashing](note/by/developer/consistent_hashing.md).
- Based on one enum like column value.
- Based on ranges of values on one column.
- Combining multiple techniques.

