---
tags: [machine-learning]
title: Regression Model
created-date: 2025-08-03T00:00:00-04:00
last-updated-date: 2025-09-13T22:00:03-04:00
---

## Linear Regression

$$ f(x_1, x_2, ..., x_n) = b + {\sum^{n}_{i=1} w_i x_i}$$

There are multiple error metrics available:

- Mean Absolute Error (MAE) $\frac{1}{n} \sum^n_{i=1}|y_i - \hat{y_i}|$
- Mean Percent Absolute Error (MAPE) $\frac{1}{n} \sum^n_{i=1}|\frac{y_i - \hat{y_i}}{y_i}|$
- Mean Squared Error (MSE) $\frac{1}{n} \sum^n_{i=1}(y_i - \hat{y_i})^2$
- Root Mean Squared Error (RMSE) $\sqrt{\frac{1}{n} \sum^n_{i=1}(y_i - \hat{y_i})^2}$

**Least Squares Method** is usually used to estimate the coefficient/weights of the model. The name indicate that it calculate the weights when **MSE** is zero.

$$MSE=||Y - \beta X||_2 = (Y - \beta X)^T(Y - \beta X)$$

$$\frac{\partial{MSE}}{\partial{\beta}} = 2X^TX\beta-2X^TY = 0$$

$$\beta=\frac{X^TY}{X^TX}$$

## Polynomial Regression

Linear regression would rarely be sufficient, the feature relationship would be non-linear in a lot of cases. Instead of using X as X in feature list, higher power of feature can be used, such as `X**2`, `X**3`.

$$ f(x_1, x_2, ..., x_n) = b + \sum^{n}_{i=1} \sum^{m}_{j=1} w_{ij} x_i^{j}$$

Apart from using power of single feature, combination of different feature is also useful in a lot of cases.

## Measurement

While the model performance is still measurable using [Variance and Bias](note/by/developer/variance_n_bias.md), different from [Deep Learning](note/by/developer/deep_learning.md) where model not really care much about features, classic regression model put a lot of emphasis on feature selection.

### Model Performance

To measure how good the model fits the training data, **R-Squared** is one option.

$$R^2 = 1 - \frac{RSS}{TSS} = 1 - \frac{\sum^{n}_{i=1}{(\beta_i-\hat{\beta_i})^2}}{\sum^{n}_{i=1}{(\beta_i-\bar{\beta_i})^2}}$$

### Coefficient Significance

To measure if the coefficient(s)/weight(s) are significant:

- **Standard Error (SE)** describes the level of spread of the sample.
- **t-value**: $\frac{estimated\ coefficient}{standard\ error\ of\ the\ coefficient}$ t-value indicate how strong the coefficient is compared to its uncertainty.
- **p-value**: If the true coefficient were zero, how often would I see a t-value this extreme. A big p-value (usually > 0.05) indicate the coefficient is consistent with noise, meaning the it is not significant.

### Correlated Features

Correlated features means multiple features containing redundant information, having confounding information (having same cause), or having causality (causing each other indirectly).

**Variance Inflation Factor (VIF)** is a metrics to determine **Collinearity** among features. Where $R^2_{X_j}$ means the $R^2$ value for all other features meaning $i \neq j$. When VIF having a big value (usually bigger than 5 or 10), meaning the feature has a collinearity with other features.

$$VIF(\hat{\beta_i}) = \frac{1}{1 - R^2_{X_j}}$$

### Feature Selection

- **Forward Selection**: Start from zero feature, and keep adding features that maximize **R-Squared**.
- **Backward Selection**: Start from all features, and keep removing features with max p-value until reaching some threshold.
- **Mixed Selection**: Combine of both above.
