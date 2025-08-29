---
tags:
  - machine-learning
title: Anomaly Detection
created-date: 2025-08-08
last-modified-date: 2025-08-25
---

## Gaussian Distribution

Find appropriate mean $\mu$ and variance $\sigma^2$ to put all training sample into a gaussian distribution.

For any data for evaluate, calculate the abnormal probably based on gaussian distribution.

$$ p(x) = \frac{1}{\sqrt{2\pi}\sigma} e^{\frac{-(x - \mu)^2}{2 \sigma^2}}$$