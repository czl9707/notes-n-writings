---
tags:
  - machine-learning
title: Variance & Bias
created-date: 2025-08-03
last-modified-date: 2025-08-25
---

## Definition

- **Bias** refers to the correctness of the model when evaluating training set. High bias typically means the model is not complex enough to derive the input-output relationship.
- **Variance** refers to the correctness of the model when evaluating test set. High Variance doesn't mean much when Bias is high as well, but means the model is overfitting training set when Bias is low.

## Against Bias

- Reduce [Regularization](#Regularization) factor $\lambda$.
- Increase Model Complexity, such as adding more layers, increasing layer size and etc.

## Against Variance

- Increase [Regularization](#Regularization) factor $\lambda$.
- More training data.

## Regularization

A standard Loss function for typical neural network looks like this:

$$J(\vec{w}, b) = \frac{1}{2m} \sum_{i=1}^{m}(f_{\vec{w},b}(\vec{x}^{(i)}) - {y}^{(i)})^2$$

And the version with regularization applied on top looks like.

$$J(\vec{w}, b) = \frac{1}{2m} \sum_{i=1}^{m}(f_{\vec{w},b}(\vec{x}^{(i)}) - {y}^{(i)})^2 + \frac{\lambda}{2m} \sum_{j=1}^{n} w_j^2$$

The intuition about regularization is reducing the gradient of each parameter over loss function by a constant value. Which preventing the model putting too much weights on all parameter to reduce unnecessary complexity of the function the model represent.

## Dropout Regularization

For a given layer, during forward propagation during training, random nodes will be ignored. And during backward propagation, the weights of ignored nodes won't be updated, since they did not contribute to the output.

Dropout layer is completely transparent during production inference.

The intuition is still, since each node have a certain chance not contributing to the training output, mode will tend to avoid putting too much weights on certain node, so that reduce overfitting.