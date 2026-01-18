---
title: Messaging Broker
tags: [system-design]
created-date: 2026-01-15T23:12:45-05:00
last-updated-date: 2026-01-17T11:02:14-05:00
---

## Problem Statement

In large-scale distributed systems, there are a lot of different parts of system work in different way.

- Implemented in different language.
- Taking different amount of time processing a single request.
- Having different SLA.
- Plus, requests comes in burst.

It is impossible to use request response pattern everywhere, such as [HTTP](note/by/developer/network_protocols.md#HTTP) and [gRPC](note/by/developer/network_protocols.md#gRPC).

Messaging brokers act as **intermediaries** that validate, store, route, and deliver messages, allowing services to work and scale in different manner. By facilitating **asynchronous communication**, senders and receivers are **decoupled**: senders do not need to know the receiver's location or whether they are currently active.

## Messaging Models

- **Point-to-Point (Message Queues)**: Utilizes a **one-to-one relationship** where each message is processed by exactly one consumer. Such as **Kafka** and **RabbitMQ**.
- **Publish-Subscribe (Pub-Sub)**: A **one-to-many relationship** where a publisher broadcasts messages to a topic, and all active subscribers of that topic receive the message. Such as **Redis Pub-Sub**

## Deliver Mechanism

- **Server Push (Dumb Consumer)**: The broker instantly notifies or pushes messages to connected consumers (e.g., **Redis Pub-Sub** and **RabbitMQ**).
- **Client Pull (Smart Consumer)**: Consumers request batches of messages from the broker at their own pace (e.g., **Kafka**).

## Key Features

### Message Persistence

**Kafka** and **RabbitMQ Streams** use append-only logs to retain messages even if subscribers are offline, and that's why they has a limited queue size. Conversely, **Redis Pub-Sub** is ephemeral and does not store messages, disconnected subscribers miss anything published while they were away.

### Replayability

Persistent brokers allow consumers to **re-read the same message** multiple times, which is useful for recovering from consumer bugs or system failures.

### Delivery Guarantees

Brokers offer different "semantics" to ensure reliability:

- **At-Most-Once**
- **At-Least-Once**: Message brokers might duplicate messages on different partition or replica to improve availability. So message might be duplicated.
- **Exactly-Once**: Filters out duplicates automatically to ensure a message is processed only once.

### Routing and Filtering

**RabbitMQ** excels at complex routing using exchanges (direct, fanout, topic, or headers) to send messages based on specific rules or wildcards. **Kafka** uses a simpler approach, primarily routing by topic and partition.

And subscriber can define a policy so it only receives a specific subset of notifications.

### Ordering and Priority

**Kafka** guarantees message sequence within a specific partition. **Redis** serializes PUBLISH commands in its request queue to maintain order

While **RabbitMQ** supports **priority queues**, where specific messages can be moved to the head of the line. While **Kafka** does not support.

### Message Lifecycle

- **Dead-letter Queues**: A destination for messages that cannot be processed successfully, setting them aside for inspection without blocking the main queue.
- **Poison-pill Messages**: Special messages sent to a consumer to signal it to stop processing and shut down.
- **Backpressure**: A mechanism to limit queue size or notify producers to slow down when consumers cannot keep up, preventing system performance degradation.