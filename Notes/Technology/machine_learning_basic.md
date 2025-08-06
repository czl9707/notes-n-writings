---
tags:
  - machine_learning
title: Machine Learning Basic
---
# Concepts
## Supervised Learning & Unsupervised Learning

The key difference between Supervised Learning and Unsupervised Learning is that Supervised Learning is provided with both data and label, while Unsupervised Learning is only provided with data. Supervised learning model is trying to figure out the rule from input to output, while Unsupervised is trying to find some characteristics from the given data.

## Gradient Descent

Based on the model evaluation result, we calculate the gradient of the loss function at current parameters. And modify the each parameter by `learning_rate * gradient` 

## Regression & Classification Problem

Regression tries to derive a value from the given input, while classification is literally put input into bucket(s).

Example: 
- Using location and size of a house to predict its price -> Regression.
- Using Lung CT image to tell the disease the lung might have.

## Model Performance
- [Variance & Bias](Notes/Technology/variance_n_bias)

## Activation Function

- Why we need Activation Function?
	- Without Activation function, each single layer of Neural Network degrade to a linear regression, while the entire model degrade to polynomial regression.
- Activation Function Options:
	- **Linear / None** 
		- Only on output linear in some cases. Very rare.
	- **Sigmoid** $A = \frac{1}{1 + e^{-x}}$
		- Binary Classification only
	- **Tanh** $A = \tanh(x) = \frac{2}{1 + e^{-2x}} - 1$
		- Alternative to Sigmoid
	- **Relu** $A = \max(0,x)$
		- Default choice
	- **Softmax**: $A(z_i) = \frac{e^{z_i}}{\sum^{K}_{j=1} e^{z_j}}$ 
		- Multi-class Classification

## Data Set

- **Training Set**: The subset of data used to train the model.
- **Cross Validation Set / Validation Set** - The subset of data used for evaluating the model during training, but not participate in backward propagation.
- **Test Set** - The subset of data won't be exposed to the model until training finish. Used to measure the performance of the model.

## Forward Propagation & Backward Propagation

- **Forward Propagation** - Referring to data passed in input-to-output direction. Forward Propagation is almost just another name 
- **Backward Propagation** - Referring to data passed in input-to-output direction. Backward Propagation is the process of computing gradients of the loss with respect to each model parameter, and using the gradient to update model weights.
	- By applying the **chain rule of calculus**, we can only focus the derivatives for each layer given their input and output, and derive the loss-layer gradient of each parameter, without worrying too much about the complexity of the entire model.
	- And we delegate the derivatives of the complex function to multiple small functions, layer by layer.
	- **Chain Rule of Calculus**, For any $y=f(g(x))$, we have: $$ \frac{dy}{dx} = \frac{dy}{dg} \cdot \frac{dg}{dx} ​$$

# Models

- [Regression Model](Notes/Technology/regression_model)
- [Decision Tree](Notes/Technology/decision_tree)
- [Clustering](Notes/Technology/clustering)
- [Transformer](Notes/Technology/transformer)
- [Anomaly Detection](Notes/Technology/anomaly_detection)
# Techniques

- [Training Optimization](Notes/Technology/training_optimization)

# Libraries

- [Scikit-Learning](https://scikit-learn.org) for traditional Machine Learning Tasks.
- [Pytorch](https://pytorch.org/) or [TensorFlow](https://www.tensorflow.org/) For Neural Network Model.
- [Numpy](https://numpy.org/) for matrices mathematics.
- [Matplotlib](https://matplotlib.org/) for Data Visualization.

[^1]:  Machine Learning Specialization https://www.coursera.org/specializations/machine-learning-introduction