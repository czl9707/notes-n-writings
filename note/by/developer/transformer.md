---
tags: [machine-learning]
title: Transformer
created-date: 2025-08-02T00:00:00-04:00
last-updated-date: 2025-09-07T16:55:19-04:00
---

**Transformer** was introduced as a machine learning architecture back in 2017[^1], with the primary focus on [Translation Task](natural_language_processing.md#Language%20Tasks). And the architecture turned out to perform really well even in the space out of translation tasks.

## Architecture

The initial Transformer model architecture consist of two parts, [Encoder](#Encoder) and [Decoder](#Decoder).

- **Encoder** takes raw input (likely text), and turn them into a vector representation.
- **Decoder** takes the output of encoder along with its own input, to generate output tokens.

However, currently the wording "[Encoder](#Encoder) " and "[Decoder](#Decoder)" can also be used to classify transformer models. Some models will only have encoder, and some will only have decoder, while some others will have both.

### Encoder

[BERT](Note/by/developer/bert.md)-like models are **encoder** only model, also called **auto-encoding model**. They are not the fancy generative models, but they do a lot of heavy lifting in production, performing tasks like [classification](note/by/developer/natural_language_processing.md#Language%20Tasks) and [semantic search](note/by/developer/natural_language_processing.md#Language%20Tasks).

### Decoder

[GPT](note/by/developer/gpt.md)-like models are **decoder** only model, also called **auto-regressive model**. It feels a bit unintuitive when knowing this for the first time, since encoder is about understanding while decoder is about generating. This still holds true, but the fact is that GPT performs [text generation tasks](natural_language_processing.md#Language%20Tasks) instead of [question answering tasks](natural_language_processing.md#Language%20Tasks). It is actually extending the prompts.

And during text generation, the model actually does not rely on the context as the way it does during translation. Each individual output token is not directly related to any specific token(s), but the entire context instead.

### Encoder-decoder

[T5](note/by/developer/t5.md)- like models have both encoder and decoder, or called **sequence to sequence model**. They are good at content generation task with respect to its input, such as translation and summarization.

## Training

Transformer, as a type of language model, is usually trained using self-supervised manner, meaning the desired output is calculated on the fly based on the input. This usually leads to model is not good at specific language task. That's why this step is called **pre-training**, and also why **GPT** has its name - **Generative Pre-trained Transformer**.

Given above, before putting the model onto specific task, it usually went through [transfer learning](note/by/developer/transfer_learning.md), or called fine-tuning, by giving input and human annotated label for it to perform supervised learning.

## Self Attention Mechanism

### Embeddings

### Semantic Similarity

[^1]: [Attention is All You Need](https://arxiv.org/abs/1706.03762)
