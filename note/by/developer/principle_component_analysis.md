---
title: Principle Component Analysis (PCA)
tags: [machine-learning]
created-date: 2025-09-21T21:14:52-04:00
last-updated-date: 2025-09-22T20:56:18-04:00
---

**Principle Component Analysis (PCA)** is a technique to reduce feature dimensions, and are commonly applied when it comes to [clustering](note/by/developer/clustering.md) task and models like [SVM](note/by/developer/support_vector_machine.md).

The intuition of PCA is fitting features on multiple dimensions on to a single dimension, while keep the maximum variance of the features.

## How it Works?

There are two methods to choose principal components on a high level:

- Preserve the maximum.
- Choose axis that minimized the mean squared distance between the original dataset and its projection onto the axis.

Number of principle components is a required parameter for PCA, it literally means the number of axes the algorithm output. The algorithm picks components one at a time. In each iteration it pick the principal component capture largest variance leftover from previous iteration, and the component should be orthogonal to the one that came before it. Each component can be represent as:

$$Z_i = \sum_{j=1}^n \phi_{ji}X_i$$

$$\sum_{j=1}^n \phi^2_{ji} = 1$$

The entire process looks like:

- Start with normalizing each feature, so each feature has a mean 0.
- Compute covariance matrix $C=\frac{1}{n-1}X^T_c X_c$
- Look for a component where $Cv = \lambda v$
	- $v$: eigenvector (principal component direction).
	- $\lambda$: eigenvalue (variance explained by that direction).
- Keep doing this until finding target number of principle components, and project feature data on to them.

## Explained Variance Ratio

Explained variance ratio is one key metrics to measure how much variance is being captured by the selected principle components.

$$\frac{Var(out)}{Var(total)}$$