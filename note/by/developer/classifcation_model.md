---
title: Classification Model
tags: [machine-learning]
created-date: 2025-09-13T10:57:00-04:00
last-updated-date: 2025-09-14T14:55:39-04:00
---

## Logistic Regression

Logistic Regression solves **binary classification** problem. It uses **Sigmoid** function as activation function on top of Linear Regression(can be others) to achieve binary classification. And **Binary Cross-Entropy Loss** is the corresponding loss function.

So the logit will be:

$$z^{(i)}=W\cdot X^{(i)} + b = \sum_{j=1}^{P} W_j X_j^{(i)} + b$$

And putting **Sigmoid** as activation function on the top:

$$\hat{Y} = \frac{1}{1 + e^{- b - {{\sum^{p}_{j=1} W_j X_j}}}}$$

Binary Cross-Entropy Loss:

$$ L(Y,\hat{Y​}) = −Y \cdot \log(\hat{Y}​) + (1−Y) \cdot \log(1 − \hat{Y}​) $$

### Confusion Matrix

Due to the native of binary classification, a model always return 1 can get 50% accuracy rate, which does not make much sense. Thus, in many cases, simply looking at error rate won't be enough when diagnosing binary classification model, since prediction errors with different cause will be treated differently.

The prediction output and actual output have four type of combination:

|                     | **Predicted Positive** | **Predicted Negative** |
| ------------------- | ---------------------- | ---------------------- |
| **Actual Positive** | True Positive (TP)     | False Negative (FN)    |
| **Actual Negative** | False Positive (FP)    | True Negative (TN)     |

Several metrics can be calculated out of the matrix:

- **Accuracy**: $ACC = \frac{TP + TN}{TP + TN + FN + FP}$
- **Recall**: $TPR = \frac{TP}{TP + FN}$
- **Specificity**: $TNR = \frac{TN}{TN + FP}$
- **Fall-out**: $FPR = \frac{FP}{FP + TN}$
- **Precision**: $PPV = \frac{TP}{TP + FP}$
- **Miss rate**: $FNR + \frac{FN}{FN + TP}$
- **F-1 Score**: $F1 = \frac{2TP}{2TP + FP + FN}$
	- Indicating the overall performance of the binary classification.
- **Area Under Curve (AUC)**: Plot FPR and TPR as a curve (called **Receiver-Operating Characteristics Curve (ROC)**) and calculate the area under the curve.

## Multi-Class Classification

Instead of output one value, the model output n(number of classes) value. And by applying a [Softmax](note/by/developer/machine_learning_basic.md#Activation%20Function) as activation function on top to get the class and score.

Similar to [Logistic Regression](#Logistic%20Regression), the logit looks like, where k is the kth category / output logit:

$$z^{(i)}_k=W_k \cdot X^{(i)} + b = \sum^{P}_{j} W_{jk} X_j^{(i)} + b$$

Multi-class Cross-Entropy Loss:

$$ L(y,\hat{y​}) = - \sum^{C}_{c=1} y_c \cdot \log(\hat{y}_c) $$

## Multi-Label Classification

Different from [Multi-Class Classification](#Multi-Class%20Classification), multi-label classification can output multiple labels as 1.