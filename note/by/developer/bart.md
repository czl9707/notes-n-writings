---
title: BART
tags: [machine-learning]
created-date: 2025-09-08T23:34:36-04:00
last-updated-date: 2025-09-09T12:01:35-04:00
---

## BART

**BART** has an architecture very similar to the "original" [transformer](note/by/developer/transformer.md) describe in the 2017 paper[^1]. And another way to think about it a [BERT](note/by/developer/bert.md)-like encoder + [GPT](note/by/developer/generative_pre_trained_transformer.md)-like auto-regressive decoder, with decoder having Cross-attention to the output of encoder.

- **BART** is trained on [masked language modeling](note/by/developer/transformer.md#Training), but the different from normal encoder stick to one corruption strategy, it can be any one. Usually, multiple tokens are replaced with a single `[mask]`, so the model need to predict a sequence of tokens. This is called *text infilling corruption strategy*.
- **BART** has an encoder architecture same as [BERT](note/by/developer/bert.md), but with some difference:
	- No more segment embeddings.
	- At the end of encoder, **BERT** pass it to a feed-forward layer for prediction, while **BART** pass that over to decoder.
- The encoder output then got passed to each decoder block. And similar to [GPT](note/by/developer/generative_pre_trained_transformer.md), the previous sequence are passed to the decoder as input as well.
	- Each decoder block includes:
		- Masked multi-head [self-attention layer](note/by/developer/drafts/self_attention_mechanism.md) with future token masked (only previous sequence are passed to)
		- Skip Connection and Sum Layer
		- Layer Normalization
		- Cross-attention layer accept input from both sides.
		- Skip Connection and Sum Layer
		- Layer Normalization
		- Feed-Forward Layer
		- Skip Connection and Sum Layer
		- Layer Normalization
- Output are passed to a language model head to predict the next token ID in the sequence.

[^1]: [Attention is All You Need](https://arxiv.org/abs/1706.03762)
