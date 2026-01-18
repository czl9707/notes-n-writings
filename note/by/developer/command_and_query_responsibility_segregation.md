---
title: Command and Query Responsibility Segregation (CQRS)
tags: [system-design]
created-date: 2026-01-15T23:15:54-05:00
last-updated-date: 2026-01-17T10:10:55-05:00
aliases: [CQRS]
---

In most of applications, reading and writing data usually has different requirement, and typically there is no single type of database can satisfy both sides, when the scale goes up.

## Command And Query

**Command and Query Responsibility Segregation (CQRS)** is a design pattern that handles reads and writes separately.

- **Command** is an instruction to make changes in the system.
- **Query** refers to reading data from the system, without side effects.

## Data Store

The key of CQRS is that commands and queries hit different databases. And the databases not necessarily need to hold the data in the same format.

So the typical flow is:

- Commands hit one database.
- Data will be synced to another database synchronously or asynchronously, with or without applying transformation on top.
- All Queries hit this database.

This pattern allows scaling reads and writes in different way. However, the drawback is pretty obvious, maintaining data consistency would be a huge challenge. The syncing part between two database become a single point