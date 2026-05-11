---
title: Retrieval-Augmented Generation (RAG)
tags: [design-pattern, machine-learning]
created-date: 2025-09-24T17:37:01-04:00
last-updated-date: 2026-05-04T21:34:04-04:00
aliases: [RAG]
---

Training a [Large Language Model](note/by/developer/transformer.md) consumes a lot of resources, and the model itself has no way to gain knowledge from outside of the training data.

**Retrieval-Augmented Generation (RAG)** is an AI framework that improves Large Language Model outputs by fetching relevant data from external, trusted sources before generating a response.

It reduces hallucinations and ensures accuracy by providing up-to-date context, making it ideal for domain-specific tasks and knowledge bases.

## How RAG Works?

1. **Retrieval**: The system takes a user query and searches an source for relevant documents or information.
2. **Augmentation**: Insert the retrieved information into model context.
3. **Generation**: The augmented prompt is sent to the LLM to generate a response that is grounded in the retrieved data.

## Where Data From?

RAG is more of a design pattern, the actual data source can be any, or even a combination them together.

- File System
- [Database](note/by/developer/database_basic.md)
- [Key Word Search](note/by/developer/key_word_search.md)
- Embedding Model
- Search Engine