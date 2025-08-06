---
tags:
  - machine_learning
title: Decision Tree
---
## Basic Concept

Decision tree is very different from normal machine learning model. It construct a tree, where each node split dataset into two part based one feature. And each leaf represents a set of possible results and corresponding probability.

During Training:
- For each node, iterate on available feature and try split the dataset into two.
	- For each feature, calculate the purity and information gain, using (p is the correctness for current node): $$H(p) = - p \log_2(p) - (1 - p) \log_2(1 - p)$$$$ Gain = H(p^{root}) - (w^{left} \cdot H(p^{left}) + w^{right} \cdot H(p^{right}) )$$
	- Select the feature has greatest positive information gain.
- Stop Slitting when:
	- Maximum depth reached.
	- A node is 100% one class
	- When improvement of purity score are below a threshold.
	- When number of examples in a node is below a threshold.
- For Continuous valued feature:
	- Split on several or all possible value and compare.

## Tree Ensemble

Ensemble typically mean multiple instance working together to give the prediction.
### Random Forest

Decision trees are super sensitive to datasets, adding or removing sample will make big difference. So the "forest" is build out of multiple trees, each trained on different random set of samples, and different random set of features.
### XGBoost

Random Forest is using "Bagging" strategy, while XGBoost uses "Boost" strategy. Trees are not built at one time, but one after another. The next tree is built upon the dataset that the previous tree made mistake on. So that later trees are correcting the errors of previous ones.