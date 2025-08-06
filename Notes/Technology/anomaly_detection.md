---
tags:
  - machine_learning
title: Anomaly Detection
---
## Gaussian Distribution

Find appropriate mean $\mu$  and variance $\sigma^2$ to put all training sample into a gaussian distribution. 

For any data for evaluate, calculate the abnormal probably based on gaussian distribution.
$$ p(x) = \frac{1}{\sqrt{2\pi}\sigma} e^{\frac{-(x - \mu)^2}{2 \sigma^2}}$$