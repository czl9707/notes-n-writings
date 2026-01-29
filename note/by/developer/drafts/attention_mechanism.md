---
title: Attention Mechanism
tags: [machine-learning]
created-date: 2025-09-09T21:21:05-04:00
last-updated-date: 2026-01-28T21:51:33-05:00
---

Attention mechanism is based on the simple nature that by applying cross-correlation (or just dot product) on two matrixes, the result will identify the similarities between vectors.

## Self Attention

As indicated by name, self attention literally mean a matrix dot product with the transpose version of itself.

### QKV Self Attention

Taking one more step further from basic self attention, simply applying dot product to the matrixes itself is not quite efficient.

One way to understand the nature of attention mechanism is that one side of the dot product asks the question (Query), the other side gives the answer (Key), and the result of the dot product indicating the level of relevance.

So that the Query and Key Matrixes can be derived differently, by applying a different mask (trainable matrix) on top. The final result is applying dot product between $Q * K$ and $V$, which is derived in a similar manner as Q and K.

## Cross Attention

In [QKV Self Attention](#QKV%20Self%20Attention), Q, K, V come from same source. Cross Attention simply mean that they come from difference source.

In context of original [transformer](note/by/developer/transformer.md), decoder pass its K and V to encoder, where attention is calculated using matrixes from both side.

## Multi-Head Attention

One "Head" refers to applying QKV self attention to the source matrix once. Multi-Head Attention applies this multiple times with different parameter sets, and concatenate all these result together into one matrix(, and potentially project it back to the original shape).