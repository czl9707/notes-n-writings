---
title: Database
tags: [database]
created-date: 2025-12-21T22:17:42-05:00
last-updated-date: 2026-01-04T13:11:00-05:00
aliases: [Database]
---

Data can be kept on disk or memory with ease, but accessing data efficiently require data stored is organized. And **DBMS(Database Management System)** are designed to access data stored on disk (or in memory) efficiently, serving as an interface between the underlying data and end-users or programs.

## Relational & Non-Relational Database

A **SQL (relational) database** is a collection of data entries with predefined relationships, organized into **tables** composed of columns and rows. SQL databases commonly adhere to the **ACID** consistency model.

**NoSQL database** is a broader concept, which literally means any database not belonging to SQL.

- **Relational Database (SQL)**: Organizes data into tables with rows and columns, using SQL for data definition and manipulation. Examples include **MySQL**, **PostgreSQL**, and **SqlServer**.
- **Document Database**: General-purpose databases that serve a variety of use cases for both transactional and analytical applications. For example, **MongoDB** storing data as JSON documents.
- **Key-Value Database**: A simple database that stores data as a collection of key-value pairs, where each key is unique and maps to a specific value. Examples include **Redis** and **Amazon DynamoDB**.
- **Column Database**: Stores data in columns rather than rows, which can be highly efficient for analytical queries and data warehousing. Examples include Apache Cassandra and Google Bigtable.
- **Graph Database**: Uses graph structures with nodes, edges, and properties to represent and store data, ideal for highly interconnected data. Examples include **Neo4j**.
- **Vector Database**: Designed to store, manage, and search high-dimensional vector embeddings, often used in AI applications for [semantic search](note/by/developer/natural_language_processing.md#Language%20Tasks) or [RAG](note/by/developer/drafts/retrieval_augmented_generation.md). Examples include **Pinecone** and **Weaviate**.

## ACID Principle

**ACID** stands for **Atomicity**, **Consistency**, **Isolation**, and **Durability**. They are different aspect for maintaining data integrity during transaction processing. **Relational Database**s are fully compliant to ACID principles.

- **Atomic**: Operations in a transaction should all succeed or all failed.
- **Consistent**: On the completion of a transaction, the database is structurally sound.
- **Isolated**: Transactions do not contend with one another. Simultaneous access to some record is moderated by the database so that they are isolated.
- **Durable**: Once the transaction has been completed and the writes and updates have been written to the disk, it will remain in the system even if a system failure occurs.

[ACID](#ACID%20Principle) is meant for data integrity and is crucial. It is so restricted that SQL database usually sacrifices performance to achieve this. However in some cases, ACID can be an overkill or performance should be prioritized.

## BASE Principle

 ACID transactions are less common in NoSQL database, and some databases have loosened the requirements for immediate consistency, data freshness, and accuracy in order to gain other benefits, like scalability and resilience.

BASE stands for:

- **Basic Availability**: The database appears to work most of the time.
- **Soft-state**: Stores don't have to be write-consistent, nor do different replicas have to be mutually consistent all the time.
- **Eventual consistency**: The data might not be consistent immediately but eventually.

## Why SQL?

There were some questions - No-SQL is more performative and flexible, why bother with SQL? Although there is no golden answer for this question, large scale project tend to use SQL database as primary store. Although using No-SQL at the beginning goes well. But it screwed up pretty rapidly when the scale went up. SQL is still dominantly strong when dealing with massive amount of data. Some No-SQL solution lack of proper structure, developer tend to change schema frequently, which potentially lead to backward compatibility problems if incautiousness.