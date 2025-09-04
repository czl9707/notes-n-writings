---
title: Natural Language Processing
tags: [machine-learning]
created-date: 2025-08-26T00:00:00-04:00
last-updated-date: 2025-09-03T17:29:10-04:00
---

## Language Tasks

- **Sentence Classification**
	- **Zero Shot Classification**: the model is not fine-tuned on the given data and label. The model only see the given label once.
- **Semantic Similarity**:
	- **Semantic Search**: Different from traditional index based search engine, Semantic Search finding related content by calculating semantic similarities between contents.
- **Token Classification**: Different from sentence classification, this is classification upon each individual word(token) in side a sentence. Such as grammatical components, or named entities.
- **Text Generation**: Generating sentence(s) using the few words(tokens) given as the beginning.
	- **Casual Language Modeling**: Predict the next word in the sentence, by giving the previous certain number of tokens.
- **Question Answering**: Not [GPT](note/by/developer/gpt.md)-like question answering, but extracting answer from the given input.
- **Translation**
- **Summarization**
- **Masked Language Modeling**: Some words(tokens) are masked when given to the model. The model tries to fill masks within the given input.