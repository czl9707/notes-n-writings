---
tags: [machine-learning]
title: Transformer
created-date: 2025-08-02T00:00:00-04:00
last-updated-date: 2025-09-28T09:49:26-04:00
---

**Transformer** was introduced as a machine learning architecture back in 2017[^1], with the primary focus on [Translation Task](note/by/developer/natural_language_processing.md#Language%20Tasks). And the architecture turned out to perform really well even in the space out of translation tasks.

One key innovation feature about transformer is [Self-Attention Mechanism](note/by/developer/drafts/self_attention_mechanism.md), which take the traditional [Attention Layer](note/by/developer/recurrent_neural_network.md#Attention%20Layer) to the next level.

## Architecture

The initial Transformer model architecture consist of two parts, [Encoder](#Encoder) and [Decoder](#Decoder).

- **Encoder** takes all raw input tokens at once, and turn them into a vector representation.
- **Decoder** takes the output of encoder to generate output tokens. The decoder output one token in each passing through, and the token will be added to the input sequence along with output of Encoder, to predict the next output token.

![Transformer](Media/TransformerArchitecture.svg)

To speed up training, the decoder is fed with the entire target sequence, shifted by one position, with a mask on top of it. So the training is not recurrent as in inference, but parallelized across all token positions. Meaning at each token position, the decoder use encoder output along with its own output calculated using previous target token sequence, to predict the next token.

%% TODO should enrich the original arcthitecutre more when I have more idea around. And redraw the image. %%

However, currently the wording "[Encoder](#Encoder) " and "[Decoder](#Decoder)" can also be used to classify transformer models. Some models will only have encoder, and some will only have decoder, while some others will have both.

### Encoder

[BERT](Note/by/developer/bert.md)-like models are **encoder** only model, also called **auto-encoding model**. They are not the fancy generative models, but they do a lot of heavy lifting in production, performing tasks like [classification](note/by/developer/natural_language_processing.md#Language%20Tasks) and [semantic search](note/by/developer/natural_language_processing.md#Language%20Tasks).

### Decoder

[GPT](note/by/developer/gpt.md)-like models are **decoder** only model, also called **auto-regressive model**. It feels a bit unintuitive when knowing this for the first time, since encoder is about understanding while decoder is about generating. This still holds true, but the fact is that GPT performs [text generation tasks](note/by/developer/natural_language_processing.md#Language%20Tasks) instead of [question answering tasks](note/by/developer/natural_language_processing.md#Language%20Tasks). It is actually extending the prompts.

And during text generation, the model actually does not rely on the context as the way it does during translation. Each individual output token is not directly related to any specific token(s), but the entire context instead.

### Encoder-decoder

[BART](note/by/developer/bart.md)- like models have both encoder and decoder, or called **sequence to sequence model**. They are good at content generation task with respect to its input, such as translation and summarization.

## Training

Transformer, as a type of language model, is usually trained using self-supervised manner, meaning the desired output is calculated on the fly based on the input. This usually leads to model is not good at specific language task. That's why this step is called **pre-training**, and also why **GPT** has its name - **Generative Pre-trained Transformer**.

There are two main approaches to train a transformer model:

- **Masked Language Modeling (MLM)**: Used by encoder models. The input token sequence has some token(s) masked, and the model is trained to predict the original masked token(s).
- **Casual Language Modeling (CML)**: Used by decoder models. The model is trained to predict the next token in the sequence, by giving the previous tokens.

Given above, before putting the model onto specific task, it usually went through [transfer learning](note/by/developer/transfer_learning.md), or called fine-tuning, by giving input and human annotated label for it to perform supervised learning.

## Inference Pipeline

The transformer model inference usually contains several pieces.

- [Tokenization](note/by/developer/tokenization.md): Converting text into token IDs.
- **Preprocessing**: Adding special Tokens, adding paddings, truncating sequence if necessary and etc.
- **Model Forward Passing**: Feeding the tokens from previous steps to the model, and generate some vector output. The output is called **Embeddings** in context of encoder-only model.
- **Postprocessing**: Removing padding tokens, or other task specific logics.
- **Task Head Output**: Only valid for encoder-only model, turning embeddings into meaningful output, such as classification.
- **Detokenization**: Only valid for model with decoder. Reconstructing the text output from output token IDs from decoder.

[^1]: [Attention is All You Need](https://arxiv.org/abs/1706.03762)
