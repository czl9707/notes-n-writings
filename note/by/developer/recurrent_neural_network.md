---
tags: [machine-learning]
title: Recurrent Neural Network
created-date: 2025-08-10T00:00:00-04:00
last-modified-date: 2025-08-31T20:57:04-04:00
---

## Concepts

The major difference of **Recurrent Neural Network** from normal network is that data is chunked into small pieces and go through the model multiple times sequentially, and former one will have impact on the later one. Taking sentence as an example, sentences is chunked into words/tokens/characters, we save the activation value derived from the previous token and pass that together with the next token to the model, and repeat this for every token.

The **Back Propagation** for **RNN**, is very much focus on task the model focusing on. We might only use the last activation value as part of loss function if that's the only thing we care eventually. We might also use all activation value to construct the loss function if we care all of them.

### Gated Recurrent Unit (GRU)

**GRU** is invented to solve the problem that the information of given token has little influence on the tokens couple of tokens away. **GRU** provides a way to have feature for current token got passed to later tokens.
$$\tilde{c}^{<t>} = a^{<t>} = tanh(w_c[c^{<t-1>}, x^{<t>}] + b_c)$$
$$\Gamma_u = \sigma(w_u[c^{<t-1>}, x^{<t>}] + b_u)$$
$$c^{<t>} = \Gamma_u \star \tilde{c}^{<t>} + (1 - \Gamma_u) \star {c}^{<t-1>}$$

### Long Short Term Memory (LSTM)

**LSTM** share the same motivation as [GRU](#Gated%20Recurrent%20Unit%20(GRU)), but output the memory cell out along with activation, and use memory from previous step to calculate the memory and activation for next step.

$$\tilde{c}^{<t>} = tanh(w_c[c^{<t-1>}, x^{<t>}] + b_c)$$

$$\Gamma_u = \sigma(w_u[c^{<t-1>}, x^{<t>}] + b_u)$$

$$\Gamma_f = \sigma(w_f[c^{<t-1>}, x^{<t>}] + b_f)$$

$$\Gamma_o = \sigma(w_o[c^{<t-1>}, x^{<t>}] + b_o)$$

$$c^{<t>} = \Gamma_u \star \tilde{c}^{<t>} + (1 - \Gamma_f) \star {c}^{<t-1>}$$

$$a^{,t>} = \Gamma_o \star tanh(c^{<t>})$$

### Bi-Directional RNN

Language is not a not a uni-directional sequence, words appearing after can have impact on the words appearing before. Thus, having token has its information passed into "future" is not enough, it ideally also should have it passed to the "past". Bi-Directional RNN is just as its, having two sets of parameter associated, one towards the future and one towards the past.

### Word Embeddings

Word Embeddings is different from "[Embeddings](note/by/developer/transformer.md#Embeddings)" in context of transformer. Word embeddings is a vector representation of words, in another word, is a dictionary where each word mapped to a vector. A good word embeddings capture semantic meanings for words, so that we can perform common analogy task like "finding the word that is to 'woman', what 'king' is to 'man'".

#### How Word Embeddings Are Learnt?

- Separate all corpus into words, and perform stemming and lemmatization.
- Come up with a word dictionary based on word count in entire corpus (Word2Vec use prediction based instead).
- The model is trained on logic that, given the model a wording context, what is probability that word B appear after word A within a certain distance. Some context possible:
	- 4 words on left & right
	- last 4 word
	- nearby 1 word
- The output would be a vector with same size of word dictionary, passed to a Softmax layer to derive the word probability. And backward propagation is performed on both embeddings and the model weights.

### Beam Search

During [Sequence Generation](#Sequence%20Generation), It is not always reliable to pick the word with highest probability all the time. Some better generation results might have not score well for its first few token. **Beam Search** is a technique for searching better generation result. It requires a hyperparameter $b$, for each iteration, it starts with the $b$ prefixes from generated from the previous iteration to generate $b$ token using each ($b^2$ in total), and only keep the top $b$. Repeat until the end, and pick the best result from them.

### Attention Model

(This attention model is not the [Self-Attention Mechanism in Transformer](note/by/developer/transformer.md#Self%20Attention%20Mechanism))

Performance of the RNN model without any attention mechanism degrades pretty drastically when corpus become longer. It's just due to the model do not have enough "memory" to keep everything inside the activation value and memory cell.

Attention model starts in machine translation domain, which is a sequence to sequence language task.

Attention model starts with a normal bi-directional RNN model, taking sequence $x^{t}$ and outputting activation $\overleftarrow{{a}^{t}}$ and $\overrightarrow{{a}^{t}}$, and using $s^{<t-1>}$ together with corresponding activation value to generate $s^{<t>}$. The attention value $\alpha^{<t, t'>}$ represents the amount of attention $y^{<t>}$ should pay to $a^{<t'>}$.

$$\alpha^{<t, t'>} = \frac{exp(e^{<t, t'>})}{\sum^{T_x}_{t'=1} exp(e^{<t, t'>})}$$

The $e^{<t, t'>}$ is derived using couple of neural network layers from $s^{<t-1>}$ and $a^{<t'>}$.

The draw back is obviously the computation cost for both training and inference, which is quadratic to the length of the sequence.

Attention Model goes strong in context of [Transformer](note/by/developer/transformer.md), and will likely more sense there.

## Language Tasks

### Classification

There are many types of classification an RNN model can perform. such as Sentiment Classification, Topic Classification, Language Classification, and Spam Detection, to name a few. For all type of classification tasks, the model output -- taken from all tokens or from a designated token -- is passed extra layers to produce class probabilities. Since the entire sequence is available at once, the model can be a bi-directional RNN to leverage both past and future context for accuracy.

### Sequence Generation

There are many types of sequence generation as well, including Translation, Summarization, Question Answering, Audio Transcription and etc. (We are not considering NLP in context of [Transformer](note/by/developer/transformer.md) yet) When performing sequence generation tasks, the model usually takes the output of each input and maps it to one or more token(s). In many applications, the model must be uni-directional, so that job generation can start before the full input sequence is available.

## Case Study

### Word2Vec

**Word2Vec** is a model used to learn word embeddings. The intuition is that words with related meanings often occur near each other in texts. It use **Skip-grams** to pick training sets, which means, randomly pick two words from a certain window, and use one of them as a context word to predict the probability of the appearance of the other one. Although training still includes a neural network, but it eventually got dropped, the word embeddings is the only thing we need.