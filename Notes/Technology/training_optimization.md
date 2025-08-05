---
tags:
  - machine_learning
title: Training Optimization
---
## Feature Scaling

- **Problem**: Some feature might have much bigger value then than others, and its associated parameter will end up pretty small, with tiny gradient value calculated every epoch, which would take a long time. And sometime even effecting the model performance.
- **Intuition** - Scale feature is fit in certain value range (such as -1 to 1), so that model can have more meaningful gradient value from first epoch.
	- **Mean Normalization**: Derive the scaling factor using mean of real feature value.
	- **Z-Score Normalization**: Derive the scale factor using standard deviation of real feature value.


- **Adam**
- **MNIST Adam**

