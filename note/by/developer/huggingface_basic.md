---
title: Huggingface
tags: [huggingface, machine-learning]
created-date: 2025-08-26T00:00:00-04:00
last-updated-date: 2025-09-28T12:32:43-04:00
---

[HuggingFace](https://huggingface.co/) is a set of libraries providing high level abstraction on top of libraries like [Pytorch](). Different from Pytorch, Huggingface focuses on [Transformer](note/by/developer/transformer.md) model rather than general purposed machine learning jobs. Same as Transformer, Huggingface is not limited to language tasks, but can also extend to image, audio and even multi-modal tasks.

## Pipeline

The most basic and high level object in the library. As its name, it connects a model with its necessary preprocessing and postprocessing steps, and wrap all of them in a single interface.

```python
from transformers import pipeline

classifier = pipeline("sentiment-analysis")
classifier("This is definitely positive.")
```

`pipeline` picks a particular pretrained model for the task `sentiment-analysis` provided, and necessary steps associated with that, if nothing is specified explicitly.

## Tokenizer

The job of tokenizer is essentially [tokenization](note/by/developer/tokenization.md). The easiest way of using tokenizer is using `AutoTokenizer.from_pretrained` to load a tokenizer from remote or local.

There are different types of tokenizer, and each has different way of tokenize string. This the `AutoTokenizer` actually "guesses" the actual implemention type of the loaded tokenizer. The actual type can be known by inspecting the loaded tokenizer's `__class__` property.

Tokenizer interface provides different API for different step of tokenization. To help understand the string split strategy, the vocab dictionary, and special token of the tokenizer.

## Model

Model class shares a lot from [Tokenizer](#Tokenizer) from the API aspects. It also allows load from remote and local, and `AutoModel` guesses the underneath type of implemention as well.

The model API provides something can help Inference Head as well. Taking `BertModel` as an example, there are multiple predefined variance for different types of tasks, such as `BertForSequenceClassification`, `BertForMaskedLM` and etc. These predefined model architecture is built with best practices and also sharable by default.

When using `transformer[torch]`, the model can be treated as a [Module](note/by/developer/drafts/pytorch_basic.md#Module)

## Trainer

Hand crafting training loops has a lot of boilerplates. Logging, validation, checkpoint saving, early stop and a lot of things can go into the loop. Trainer API helps set up fine-tune and training pipeline easier.

## Datasets

In context of [pytorch](note/by/developer/drafts/pytorch_basic.md), Datasets is a wrapper of [DataLoader](note/by/developer/drafts/pytorch_basic.md#DataLoader), with some utilities provided. Such as train test split, batch processing, and other datasets operations.