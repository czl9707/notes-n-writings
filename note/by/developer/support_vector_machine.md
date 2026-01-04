---
title: Support Vector Machine (SVM)
tags:
  - machine-learning
created-date: 2025-09-17T20:17:58-04:00
last-updated-date: 2025-12-28T20:16:31-05:00
aliases:
  - SVM
---

**Support Vector Machine (SVM)** is similar to [Logistic Regression](note/by/developer/classifcation_model.md#Logistic%20Regression) to some extents. They both trying to find the decision boundary between two or more groups of training samples. SVM is explicitly looking for a hyper plane in feature space to split training samples.

Different from logistics regression where all sample data are participating in finding decision boundaries, only a small chunk of data is "supporting" the hyperplane in SVM. Thus, those points contributing to the hyperplane called **Support Vectors** and for each support vector the distance to the hyperplane should be no larger than **Margin**.

Similar to all model depending on sample distances, SVM suffer from "Curse of Dimension", [PCA](note/by/developer/principle_component_analysis.md) and other dimension reduction methods are applied on top of features very commonly.

## Hard & Soft Margin Classifier

Hard and soft is referring to if the hyperplane allow any sample to live in the opposite side. This, obviously, hard margin classifier would only work in linearly separable datasets. Both hard and soft margin classifiers are linear classifiers, meaning there are no interactions among features. So the hyperplane can have equation:

$$y_i * (\sum_{j=1}^n w_j x_{ij} + b) \geq 1$$

The hard margin classifier has no error tolerance, which indicates that the **Margin** is the distance from closest support vector to hyperplane, meaning all support vectors are living in the margin.

The soft margin classifier allows some points got classified into the wrong side of the hyperplane. Therefore, an error rate is assigned to each support vector.

$$y_i * (\sum_{j=1}^n w_j x_{ij} + b) \geq 1 - \xi_i$$

To control total error, the error factor is added to the equation we minimizing.

$$\min_{w, b, \xi} \; \frac{1}{2} \|w\|^2 + C \sum_{i=1}^n \xi_i$$

Where C is the error budget, a smaller C indicate a higher tolerance of error.

## Kernel Method

The linear hyperplane is insufficient in a lot of cases, therefore, the soft margin classifier got generalized to fit none linear example distributions.

[Polynomial Regression](note/by/developer/regression_model.md#Polynomial%20Regression) is kind of hard to train, but differently in SVM, the the interaction among features is only for product. The formula can be written as below, where $x_i$ is all training sample and $\alpha_1$ is support vector weights.

$$f(x) = \text{sign}\!\Big(\sum_{i=1}^n \alpha_i y_i (x_i \cdot x) + b\Big)$$

And this can be generalized to

$$f(x) = \text{sign}\!\Big(\sum_{i=1}^n \alpha_i y_i K(x_i, x) + b\Big)$$

And the K kernel methods can be different.

- Polynomial Kernel: $K(x_i,x)=(1+x_i \cdot x)^d$
- Radial Kernel: $K(x_i,x)=exp(-\gamma ||x-x_i||^2)$
