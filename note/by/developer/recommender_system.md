---
title: Recommender System
tags: [machine-learning]
created-date: 2025-09-24T21:23:47-04:00
last-updated-date: 2025-09-27T12:51:30-04:00
---

## Popularity Based

Popularity based recommender system might be the simplest approach for recommending contents. It based on a simple assumption. That people would like the content popular among a lot of other people.

## Content Based

**Content Based** approach requires a lot of hand-engineered feature for both user and content, which usually require at least some level of domain-specific understanding. It based on the assumption that user or content with similar feature will be similar.

## Collaborative Filtering

No need for hand-engineered features. No need for domain-specific knowledge.

The model learns from users' interaction with contents. Given this nature, it may suffer from cold-start problem, meaning the model don't know what to suggest. And [Popularity Based](#Popularity%20Based) or [Content Based Method](#Content%20Based) is used often to solve the cold start problem.

### Neighborhood Methods

One way to utilize users' interaction is using a User-Content Matrix. And calculate similarities between users/contents based on the matrix, and make the prediction based on the similarities between the prediction target and training sample.

There are multiple ways to define similarity between user and user, content and content.

- **Jaccard**: $\frac{|S_a \cap S_b|}{|S_a \cup S_b|}$
- **Cosine Similarity**: $\frac{a \cdot b}{||a||||b||}$
- Distance-based: $\frac{1}{1 + distance}$
	- **Manhattan Distance**: $\sum^n_{i=1}{|X^a_i - X^b_i|}$
	- **Euclidean Distance**: $\sqrt{\sum^n_{i=1}{(X^a_i - X^b_i)^2}}$
	- **Minkowski Distance**: $(\sum^n_{i=1}{|X^a_i - X^b_i|^N})^{\frac{1}{N}}$

User-Content matrix is usually pretty sparse, meaning a lot of data is `NaN`, which is usually got replaced with mean data of the specific User across all content.

### Matrix Factorization

Another way of utilizing the User-Content Matrix is factorizing the matrix into two or more matrixes. Give a matrix of shape $(n, m)$, it can be converted $(n, j) \cdot (j, m)$ or $(n, j) \cdot (j, j) \cdot (j, m)$ or even more.

There multiple way to make the conversion:

- **Single Value Decomposition (SVC)**
	- It convert $(n, m)$ to $(n, j) \cdot (j, j) \cdot (j, m)$.
	- SVC is a generalization of Eigen Decomposition. Where the original matrix can be non-square-shaped and non-symmetric. Which is somewhat similar to [PCA](note/by/developer/principle_component_analysis.md)
- **Non-negative Matrix Factorization (NMF)**
	- It convert $(n, m)$ to $(n, j) \cdot (j, m)$, and the original matrix should not have negative value.
	- $j$ is a hyper-parameter can be tuned.
	- Trained using different type of Loss Functions with gradient descent to derive the result matrixes.
		- L2 Loss
		- L1 Loss
		- KL Loss
		- Itakura-Saito (IS) Loss