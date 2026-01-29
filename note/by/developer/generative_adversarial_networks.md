---
title: Generative Adversarial Networks (GAN)
tags: [machine-learning]
created-date: 2026-01-25T10:22:59-05:00
last-updated-date: 2026-01-25T11:02:39-05:00
aliases: [GAN]
---

**Generative Adversarial Networks (GAN)** is a type of machine learning framework for training generative machine learning models. The framework contains two neural networks (a [Generator](#Generator) and a [Discriminator](#Discriminator)) compete to create realistic, synthetic data such as images.

*Taking image generation task as an example.*

## Generator & Discriminator

During training:

- Generator take the desired input (or just random noise), and generate an image, likely just noise at first few rounds.
- Discriminator take what generator produce along with some real image, and try classify both of them.
- Apply gradient descent on both networks with different loss function.
	- The objectives of discriminator is predicting the generated ones as fake, and real ones as real, and maximizing the difference of possibilities.
	- The objectives of generator is minimizing the difference between two sets of possibilities, and eventually producing a close probability comparing to real images.

Different from most of machine learning tasks, the training process on two parts usually happened alternatively. Meaning few epochs on generator, then few epochs on discriminator, then few epochs on generator and so on so forth.

The model converges when discriminator starts to make mistake, which means the iiscriminator can only guess with 50% accuracy.