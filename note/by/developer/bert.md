---
title: BERT
tags: [machine-learning]
created-date: 2025-09-08T22:05:07-04:00
last-updated-date: 2025-09-08T23:21:59-04:00
---

## BERT

**BERT** is an encoder-only model and is the first model to implement deep bidirectionality to learn rich text context by attending to words on both sides.

**BERT** is not only trained for [masked language modeling](note/by/developer/transformer.md#Training), and also for **next sentence prediction (NSP)**, which means for predicting whether a sentence following another. However this feature got dropped in later model in BERT family, because sentence embeddings are sufficient for it.

- BERT uses [WordPiece](note/by/developer/tokenization.md#WordPiece) to parse input text into word tokens.
	- `"playing" => ["play", "##ing"]`
- To differentiate different sentences, a `[SEP]` tokens are inserted.
- A `[CLS]` is added to the beginning of the token sequence, which is specialized for [Language Tasks](note/by/developer/natural_language_processing.md#Language%20Tasks).
- Word tokens then got mapped to word embeddings, which is trained as part of the model.
	- `["play", "##ing"] => [1234, 9876] => [[...], [...]]`
- Segment embedding are added to denote whether a token belongs to the first or second sentence in a pair of sentences, in context of **NSP**.
- Position embedding are added to denote position of each token.
- The input embeddings are passed through multiple encoder layers to output some final hidden states.
	- The final hidden states will have similar structure as input tokens, one embedding vector mapped to one token.
	- Each encoder block contains:
		- Multi-Head [self-attention layer](note/by/developer/drafts/self_attention_mechanism.md).
		- Skip Connection and Sum Layer
		- Layer Normalization
		- Feed-Forward Layer
		- Skip Connection and Sum Layer
		- Layer Normalization
- In **masked language modeling (MLM)**, the final hidden states is passed to a feedforward network with a [softmax](note/by/developer/machine_learning_basic.md#Activation%20Function) layer to predict the mask token(s).
- In **next sentence prediction (NSP)**, the final hidden states is passed to a feedforward network with a [softmax](note/by/developer/machine_learning_basic.md#Activation%20Function) layer to perform the binary classification.