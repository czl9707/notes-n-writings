---
tags:
  - machine-learning
title: Decision Tree
created-date: 2025-08-03T00:00:00-04:00
last-updated-date: 2025-12-28T20:13:33-05:00
aliases:
  - Decision Tree
---

## Basic Concept

Decision tree is very different from normal machine learning model. It construct a tree, where each node split dataset into two part based one feature. And each leaf represents a set of possible results and corresponding probability.

During Training:

- For each node, iterate on available feature and try split the dataset into two.
	- For each feature, calculate the purity and information gain:
	  $$ Gain = H(X^{root}) - (w^{left} \cdot H(X^{left}) + w^{right} \cdot H(X^{right}) )$$

	- Select the feature has greatest positive information gain.
	- To calculate the purity of each node, where p is the correctness for current node:
		- **Entropy** measures uncertainty: $H(X) = - \sum_k p_k \log_2(p_k)$
		- **Gini** measures impurity: $H(X) = \sum_k p_k(1 - p_k)$
- Stop Slitting when:
	- Maximum depth reached.
	- A node is 100% one class
	- When improvement of purity score are below a threshold.
	- When number of examples in a node is below a threshold.
- For Continuous valued feature:
	- Treat several or all possible on a feature as potential splitting points.

## Decision Tree Regression

The major different between using decision tree for classification and regression is the metrics measure model performance during tree splitting. When performing regression tasks, **Mean Square Error (MSE)** is been used.

## Prevent Overfitting

Decision tress are very easy to overfit. There are several tricks to help optimize this.

- **Early Stopping**: There are multiple hyperparameters are available to stop the tree from splitting: `max_depth`, `min_samples_split`, `min_samples_leaf`, `min_weight_fraction_leaf`, `min_impurity_decrease`, `max_features` and etc.
- **Pruning**: Instead of stopping the tree from growing, another approach is letting it grow at will, and prune some branches.
	- **Minimal Cost-Complexity Pruning**: Each node has $\alpha_{eff} = \frac {H(X) - H(x)}{|X| - 1}$, which measures the information gain of splitting certain node in proportion to the tree size. Then all nodes with a $\alpha_{eff}$ smaller than certain threshold would be pruned.
- **Ensembling**

## Tree Ensemble

Ensemble is not limited to decision tree algorithm, but a general modeling strategy. It refers to using multiple stump(instance) working together to give the prediction. Each model instance is trained on different set of training samples and even different set of features.

There are two ensemble strategy in general:

- **Bagging**, all stumps are equivalently important, the final result is derived from a pool of individual result.
- **Boosting**, all stumps are built sequentially, with each one focusing on the error made by previous models.
	- The base stump is trained as normal, and for each sample we initialize and keep a residual value $r = y$.
	- And for each later iteration, fit the tree and reduce model residual with a factor constant lambda, by fitting to model to residual instead of y number. $r_i^{(m)} = r_i^{(m-1)} - \lambda L(y_i - \hat{y}_i^{(m)})$
	- The inference utilize all stumps, where h refers to individual instance $\hat{y}(x) = \hat{y}^0(x) + \sum^M_{m=1}\lambda h^{(m)}(x)$

### Random Forest

**Random Forest** is a ensemble **bagging** model whose base model is decision tree. As the name indicating, the "forest" is build out of multiple trees, each trained on different random set of samples, and **different random set of features**.

### AdaBoost

Different from general ensemble methods having a same $\lambda$ shrinkage factor for all stumps, it calculating a different one for each stump during training. And it also give different weights to different sample data. For each sample, if the previous stump cannot predict it correctly, it will have a heavier weight in next stump. For each stump, if it has a high accuracy, it will have a shrinkage factor $\lambda$.

- Initialize sample weights $w_i = \frac1N$.
- Repeat for certain iteration, in each iteration b:
	- Fit a tree $f_b(x)$ to training data (different from general ensemble methods fitting residual) with sample weights $w_i$.
	- Calculate error $E_b = \frac {\sum^N_{i=1} w_i I(y_i \neq f_b(x_i))}{\sum^N_{i=1} w_i}$.
	- And assign the stump with factor $\lambda_b = \frac{1}{2} log(\frac{1 - E_b}{E_b})$
	- Update sample wights $w_i = w_i \cdot exp(\lambda_b \cdot I(y_i \neq f_b(x_i)))$
- Output $F(x) = sign[\sum^B_{b=1} \lambda_b f_b(x)]$, where `sign` is literally output 1 or -1.

### Gradient Boosting

**Gradient Boosting** is a generalized boosting algorithm. Instead of fitting the model to a residual got kept track for each sample, it fit the model to the negative gradient.

$$g_i^{(m)} = \frac{\partial L(y_i, \hat{y}_i^{(m-1)})}{\partial \hat{y}_i^{(m-1)}}$$

### Which to Pick?

When number of features is big (more than hundred), **Random Forest** performs better. While **Gradient Boosting** almost always performs better than **AdaBoost**.