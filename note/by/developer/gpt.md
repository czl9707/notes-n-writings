---
title: GPT
tags: [machine-learning]
created-date: 2025-09-08T20:49:01-04:00
last-updated-date: 2025-09-09T20:33:23-04:00
---

## GPT-2

GPT-2 is a decoder-only model, with good capability on text generation tasks.

- GPT-2 uses [BPE](note/by/developer/tokenization.md#Byte%20Pair%20Encoding) to tokenize words into word tokens.
	- `"playing" => ["play", "ing"]`
- Word tokens are mapped to token IDs then to word embeddings.
	- `["play", "ing"] => [1234, 6543] => [[...], [...]]`
	- The word "embeddings" here is somewhat close to the [word embeddings](note/by/developer/recurrent_neural_network.md#Word%20Embeddings) in traditional Language modeling, although the embeddings training is part of the model training instead trained elsewhere.
- The positional encoding are added, which indicate the position of each token.
- The embeddings are passed through multiple decoder blocks to derive the final hidden state.
	- Each decoder block contains:
		- Masked multi-head [self-attention layer](note/by/developer/drafts/self_attention_mechanism.md) with future token masked
		- Skip Connection and Sum Layer
		- Layer Normalization
		- Feed-Forward Layer
		- Skip Connection and Sum Layer
		- Layer Normalization
- The last hidden state is passed to a language modeling head to convert it to logits, which would be the ID of the next token in the sequence.
- The loss function used is Cross-Entropy Loss.