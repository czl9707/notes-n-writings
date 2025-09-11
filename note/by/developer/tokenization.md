---
title: Tokenization
tags: [machine-learning]
created-date: 2025-09-08T17:34:51-04:00
last-updated-date: 2025-09-09T22:27:14-04:00
---

Tokenization is a key process in [NLP](note/by/developer/natural_language_processing.md), where we split text corpus into tokens, before passing them into the language model itself.

"Splitting words" might sounds pretty simple, any language has a `split` function on string class. However, we would like to control the number of unique tokens while keep each each token meaningful, and splitting sentence into words is far from enough. A simple example will be splitting `don't`. Ideally we want it to be `["do", "n't"]` but either space or punctuation can achieve.

And I was surprised that tokenization is actually a product of some kind of training on top of the given corpus, so usually the tokenizer is specific to a certain model.

## Byte Pair Encoding

**Byte Pair Encoding (BPE)** was introduced in 2015[^1], and is used by model like [GPT-2](note/by/developer/gpt.md#GPT-2), **RoBERTa**, **FlauBERT** and etc.

BPE starts with some kind of pre-tokenization, can be as simple as splitting by space, or any advanced ones. Then unique words are collected and counted. And each word is being treated as a sequence of character initially

``` python
>> ("back", 3), ("cat", 5), ("can", 6), ("bake", 4)
>> ("b", "a", "c", "k", 3), ("c", "a", "t", 5), ("c", "a", "n", 6), ("b", "a", "k", "e", 4)
```

Then the algorithm trying to find the most frequently appeared symbol pair and merge them, and keep doing this. At the end we likely end up with:

``` python
>> ("ba", "c", "k", 3), ("ca", "t", 5), ("can", 6), ("ba", "k", "e", 4)
```

And for a work `"bat"`, the word token above will split it into `["ba", "<unk>"]` since `"t"` is not part of the token collections. The example makes not much sense, but BPE can definitely split `"tokenize"` into `["token", "ize"]`.

### Bytes Level BPE

**BPE** will end up with a really large token collection when dealing [Unicode](note/by/developer/drafts/text_encoding.md#Unicode), which will treat every emoji 😀 as a unique token. [GPT](note/by/developer/gpt.md) treat Unicode character in byte scale. If one Unicode is 3 bytes, it will be treated as 3 tokens initially.

## WordPiece

**WordPiece** is used by [BERT](note/by/developer/bert.md).It is extremely similar to **BPE** excepts its merging criteria. BPE merges on most frequent one, while WordPiece maximize the token appearance probability.

For each token belongs to the vocabulary have $P(t)$. A sequence of token have $P(t_1,t_2,...,t_n)=\prod\limits_{i=1}^n P(t_i)$. And merging logic will be maximizing $\sum_{t\in V} count(t) \cdot \log P(t)$

## Unigram

**Unigram** was introduced in 2018[^2]. Different from **BPE** and **WordPiece** using merging strategy, Unigram start with a much larger token vocabulary and keep trimming it down to maximize the probability (similar to WordPiece from this aspect), until reaching desired vocabulary size. The initial vocabulary will contain all single character, all unique word, and those most common substrings.

Since Unigram is not merging tokens, it is very likely one word can be construct in multiple ways. Unigram keep the probability of tokens from training, and use that probability to find the combination maximize probability.

Unigram is not used directly in any model, but it is used in conjunction with **SentencePiece**.

## SentencePiece

**SentencePiece** was introduced in 2018 as well[^3]. **BPE** and **WordPiece** make the assumption that word is space separated, which is not the case in languages like Chinese, Japanese. Thus **SentencePiece** treats the input sequence as a whole, including the space (if applicable), and perform unigram or **BPE** on top of that.

[^1]: [Neural Machine Translation of Rare Words with Subword Units](https://arxiv.org/abs/1508.07909)
[^2]: [Subword Regularization: Improving Neural Network Translation Models with Multiple Subword Candidates](https://arxiv.org/abs/1804.10959)
[^3]: [SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing](https://arxiv.org/abs/1808.06226)
