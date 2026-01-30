---
title: Attention Mechanism
tags: [machine-learning]
created-date: 2025-09-09T21:21:05-04:00
last-updated-date: 2026-01-29T08:32:25-05:00
---

The attention mechanism is built on a simple principle: using the **dot product** between vectors to measure similarity. In a neural network, this allows the model to "focus" on the most relevant parts of the input sequence when processing data.

## Self Attention

As the name implies, self-attention involves calculating the relationship between a sequence and itself. It allows each token in a sentence to look at every other token to better understand its own context.

### QKV Self Attention

Taking one more step further from basic self attention. Simply performing a dot product on raw input matrices is inefficient.

One way to understand the nature of attention mechanism is that one side of the dot product asks the question (Query), the other side gives the answer (Key), and the result of the dot product indicating the level of relevance.

So that the Query and Key Matrics can be derived differently, by applying a different trainable weight matrices on top. Similarly, $V$ indicate the actual contents the source matrics contain, which is derived in the same way.

The attention score is calculated by taking the dot product of Q and K^T, applying a Softmax function to get a probability distribution, and using those weights to create a weighted sum of V.

$$Attentiom(Q,K,V) = softmax{(\frac{QK^T}{\sqrt{d_k}})}V$$

## Cross Attention

In [QKV Self Attention](#QKV%20Self%20Attention), Q, K, V originate from the same source. In Cross Attention, they come from difference source.

In context of original [transformer](note/by/developer/transformer.md), encoder pass its K and V to decoder, where attention is calculated using matrices from both side.

## Multi-Head Attention

​A single "Head" refers to one independent set of Q, K, and V transformations. **Multi-Head Attention** runs this process multiple times in parallel using different learned linear projections. This allows the model to simultaneously attend to information from different representation subspaces. The results are concatenated and projected back to the original dimensions.