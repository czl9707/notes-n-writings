---
title: Huggingface
tags: [huggingface, machine-learning]
created-date: 2025-08-26T00:00:00-04:00
last-updated-date: 2025-09-01T23:11:02-04:00
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

## Model