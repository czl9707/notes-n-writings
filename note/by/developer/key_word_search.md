---
title: Key Word Search
tags: [search-engine]
created-date: 2026-04-23T08:45:43-04:00
last-updated-date: 2026-05-04T20:44:17-04:00
aliases: [Key Word Search]
---

TF-IDF is a technique powering search engines, it simply says the more and the more frequent the document contains the user search keywords, it is more likely to relate to the search.

It is widely used in system like [RAG](note/by/developer/retrieval_augmented_generation.md) and it shares a similar idea as traditional [database index](note/by/developer/database_index.md).

## Term Frequency (TF)

Similar to database use one or more keys to index each row of data, **TF** use each word within the document to do so.

It literally means creating a inversed index table to search for documents containing the keyword. Where each row is one key word, each column is one document, and the cell is the number of times the key word shows in the document.

## Term Frequency-Inverse Document Frequency (TF-IDF)

There are several problems not solved by **TF**.

- Longer document naturally has more words, make it more likely to show up in the search results.
- Word located at different positions of the document means differently.
- Word means differently when appearing together with others words.

The solution is making the cell a number weighted on different aspects. The length of the document, words' position and etc.

## Best Matching 25 (BM25)

BM25 is an refined version of [TF-IDF](#Term%20Frequency-Inverse%20Document%20Frequency%20(TF-IDF)).

$$IDF * \frac{TF * (k_1 + 1)}{TF + k_1 * (1 - b + b * (\frac{doc \space length}{average \space doc \space length}))}$$

This gives the score for a single keyword, where $k_1$ and $b$ are two tunable parameter.

BM25 gives some benefits over normal TF-IDF.

- Term Frequency Saturation.
- Long Document get smaller penalty.