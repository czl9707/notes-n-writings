---
title: Retrieval-Augmented Generation (RAG)
tags: [design-pattern, machine-learning]
created-date: 2025-09-24T17:37:01-04:00
last-updated-date: 2026-05-11T15:21:28-04:00
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

## Chunking

Chunking is the practice of braking longer text documents into smaller chunks. The rationale behind this is simple. As the document become larger, the document tends to contain complex semantics meaning. Using one vector to represent the entire document likely wiped out meanings of chapters, and not necessarily can capture the meaning of the entire document precisely.

There are many different way of chunking, and the tradeoff is always around two topics, balanced the chunk size, integrity of semantics meaning of each chunk.

- Chunk by fixed size.
- Chunk with overlapping.
- Chunk by chapter, page, or paragraph.
- Semantic Chunking.
	- Move through document, vectorize and compare, if chunks having a distance below threshold, add sentence to chunk, split when above.
	- Very Expensive.
- Prompt LLM to create chunks from a document.
- Context Aware Chunking: Having LLM to add some context of the document to the chunk.

## Query Parsing

User submitted prompt can be mis-leading from LLM's aspect, so It is very necessary to have LLM to rewrite the prompt from user before it submitted to the retriever. To add necessary context, remove unnecessary information, or even rewrite entire thing.

## Reranking

Reranking is a technique used as a post-processing step after one or more retrieval methods return their result. It literally mean passing all candidates retrieved by all methods to a more capable LLM, and let it re-rank the result.

### Cross-encoder

Cross-encoder means concatenating prompt and document together and passing to LLM to generate a score of relevance. It works horrible as a retrieval method on big scale of documents, but works well as a reranking method on pre-selected candidates.