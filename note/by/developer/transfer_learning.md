---
title: Transfer Learning
tags: [machine-learning]
created-date: 2025-09-03T17:33:39-04:00
last-updated-date: 2025-09-08T22:05:03-04:00
---

**Transfer Learning** refers to taking another model as a starting point for training, instead of building the model from scratch and then training it from random initialized weights. The prerequisite is that the source model for transfer learning share some level of knowledge with the task. Such as a dog recognition model can be trained on top of an object detection model.

There will be multiple reasons and cases that we would prefer transfer learning other than training from scratch,

- Training data is limited for the specific task.
- Saving a lot of time and computing resources, especially the source model is a large model like [BERT](Note/by/developer/bert.md) or [GPT](note/by/developer/gpt.md).
- Saving efforts for architecture design. However the end model will be restricted to that more or less.

## Inference Head

Apply one or more layers on top of the output vector from the source model of transfer learning. In another word, the **Inference Head** is a slim model taken the output of source model as input, and output the desired end product. Such as performing [Sentence Classification](note/by/developer/natural_language_processing.md#Language%20Tasks) on top of [BERT](Note/by/developer/bert.md).