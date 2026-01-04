---
tags: [machine-learning]
title: Convolutional Neural Network (CNN)
created-date: 2025-08-07T00:00:00-04:00
last-updated-date: 2025-12-28T20:12:40-05:00
aliases: [CNN]
---

## Concepts

### Convolution Layer

For a single channel convolution layer, the layer will container filter of size $f \times f$. Other than size $f$ as a hyperparameter, two other are required, padding $p$ and stride $s$.

Given input of size $x \times y$, we pad the $p$ cell to each side to make the input of size $(x + 2p) \times (y + 2p)$. From the padded input, start from left top corner, we pick a square of size $f \times f$ and apply dot product with the parameter and get an scalar output. For every square moving right or down $stride$ cell, we do the same thing, getting an output of size:

$$\lfloor \frac{x + 2p - f}{s} + 1 \rfloor \ \times \lfloor \frac{y + 2p - f}{s} + 1 \rfloor$$

Taking channel into consideration, if input have $d_{in}$ channel. Then the parameter become of size $f \times f \times d_{in}$, by adding up $d_{in}$ channel, we get an output same as above. Then if we are going to output $d_{out}$ channel, the parameter becomes size of $f \times f \times d_{in} \times d_{out}$.

### Pooling Layer

**Pooling Layer** has no parameters associate, the only thing doing is shrinking the size of the volumn. For example shrink input with size $x \times y\times z$ into $\frac{x}{2} \times \frac{y}{2} \times z$ by consolidating each $2 \times 2$ square into one cell. Some variants are **Mean Pooling** and **Max Pooling**.

### Inception Module

Convolution Layer with different size $n$ value focus on different aspect, in general, the bigger the size is, the more global aspects it focus on. The problem with typical convolution layer is that, global features got lost after a layer with small n value, or detail features got lost after a layer with big n value. **Inception Module** is essentially running convolution layer with different size value at once, and concatenate them into one volumn.

### Projection

**Projection** is another name for convolution layer with filter size as 1, and only have one channel. it flatten the input on the axis of channel.

### Transpose Convolution Layer

**Transpose Convolution Layer** behave in an opposite way of how [Convolution Layer](#Convolution%20Layer) works. It take one value from the input and multiply with the filter, and repeat this for every cell, and overlay all them with some overlapping, and getting an output with size bigger than the input.

## Image Tasks

### Object Detection

**Object Detection** take convolutional neural networks to the next stage. Other than trying to classify image into categories, the model also identify the position of the object inside the image by outputting a bounding box $(x_1, y_1), (x_2, y_2)$ along with the class probabilities.

To consider the model has a correct prediction, we cannot expect the bounding box predicted and labeled are completely the same. **IoU(Intersection Over Union)** is usually calculated to indicate the correctness.

$$IoU = \frac{S_{intersection}}{S_{union}}$$

Historically it is more than often to chunk the image into small pieces (with different size and overlapping with each other) and run the model on each piece separately to have a better prediction accuracy. Therefore, It is also fairly common to have one model predict the position of multiple object. One challenge is whether and which box(es) to pick or ignore when multiple prediction are valid. For boxes overlapping with each other, **IoU** is used again to define two bounding boxes are describing the same object.

### Image Segmentation

Image Segmentation is type of Image task taking [Object Detection](#Object%20Detection) to the next level. Other than just identifying bounding box of detected object, it also identify the class label each pixel got classified to. The output size of the model would be completely the same as the input. Each output value indicate the class the corresponding pixel belongs to.

### Image Style

Image Style detection is a by-product of a CNN image model. When looking at the hidden layers of the neural network, each channel of one layer represent some aspects of an image, can be color, texture, strikes, and etc. One way to understand style is the correlation between channels.

### Face Recognition

**Face Recognition** is a **One Shot Learning** Task, meaning the production input won't be part of training set, the model only have one chance to see it. So the task essentially is finding the degree of similarity between two image in terms of identity, somewhere similar to [semantic similarity](note/by/developer/natural_language_processing.md#Language%20Tasks) in language tasks.

The model input an image and output an image embeddings represent the identity. By applying some similarity metric (Cosine Similarity, Euclidean Distance) on two embeddings to find the level of similarity of two image.

During training, the model is trained on three input in one shot, **anchor input**, **positive input**, **negative input**. Obviously, anchor is more close to positive one rather than negative one. The loss function is straight forward as well.

$$distance(anchor, positive) \lt distance(anchor, negative) - margin$$

## Case Study

### MobileNet

The key innovation of **MobileNet** comparing normal one is its drastically reducing computation resources required without losing prediction accuracy too much.

It achieve so by breaking a normal convolution layer into two step to save computation resources. It apply one filter per input channel without apply sum on top of that, without doing any sum on top of that, and then applying a projection to flatten that into one channel.

A normal convolution layer cost $x \times y \times D_{in} \times D_{out} \times f \times f$. While **MobileNet** reduce that to $x \times y \times D_{in} \times f \times f + x \times y \times D_{in} \times D_{out}$.

### YOLO

**YOLO** Stands for **You Only Look Once**. The major innovation is just as its name, it looks at each pixel in the image only once, different from the historic way mentioned in [Object Detection](#Object%20Detection).

It logically chunks the image into $n$ small segment, but still requires passing the entire image to the model. The model output $n$ sets of values, with each set representing the prediction result in one logic segment, including a bounding box and class probabilities

### U-Net

**U-Net** is an implementation of **Image Segmentation**. The model has two main parts, then Contracting Path and Expanding Path.
- The Contracting Path repeats blocks of `Convolution → ReLU → Convolution → ReLU → MaxPooling`, each block half the feature size, and double the channel number.
- The Expanding Path repeats blocks of `Convolution → ReLU → Convolution → ReLU → Transpose Convolution`, each block double the feature size, and half the channel number.
- The feature size of the nth Contracting Path layer would be the same as the last nth Expanding Path, we add a skip connection between them.

%% TODO add a image... %%