---
tags:
  - machine-learning
title: Regression Model
created-date: 2025-08-03
last-modified-date: 2025-08-25
---
- **Linear Regression**
	$$ f(x_1, x_2, ..., x_n) = b + {\sum^{n}_{i=1} w_i x_i}$$
- **Polynomial Regression** - Apart from using X as X, it also trying to use X as `X**2`, `X**3` and ETC as input.
	$$ f(x_1, x_2, ..., x_n) = b + \sum^{n}_{i=1} \sum^{m}_{j=1} w_{ij} x_i^{j}$$
- **Logistic Regression** - Using **Sigmoid** function as activation function on top of Linear Regression(can be others) to achieve binary classification. And **Binary Cross-Entropy Loss** is the corresponding loss function.
	- Function with Sigmoid on top: $$f(x_1, x_2, ..., x_n) = \frac{1}{1 + e^{- b - {{\sum^{n}_{i=1} w_i x_i}}}}$$
	- Binary Cross-Entropy Loss: $$ L(y,\hat{y​}) = −y \cdot \log(\hat{y}​) + (1−y) \cdot \log(1 − \hat{y}​) $$
- **Multi-Class Classification** - Instead of output one value, the model output n(number of classes) value. And by applying a Softmax as activation function on top to get the class and score.
	- Multi-class Cross-Entropy Loss: $$ L(y,\hat{y​}) = - \sum^{C}_{c=1} y_c \cdot \log(\hat{y}_c) $$