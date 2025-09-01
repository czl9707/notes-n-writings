---
tags: [machine-learning]
title: Training Optimization
created-date: 2025-08-03T00:00:00-04:00
last-modified-date: 2025-08-31T20:57:32-04:00
---

## Feature Scaling

- **Problem**: Some feature might have much bigger value then than others, and its associated parameter will end up pretty small, with tiny gradient value calculated every epoch, which would take a long time. And sometime even effecting the model performance.
- **Intuition** - Scale feature is fit in certain value range (such as -1 to 1), so that model can have more meaningful gradient value from first epoch.
	- **Mean Normalization**: Derive the scaling factor using mean of real feature value.
	- **Z-Score Normalization**: Derive the scale factor using standard deviation of real feature value.

## Gradient Descent with Momentum

One behavior of gradient descent in general is that parameters moves more constant in some direction than the other. And **Gradient Descent with Momentum** keep track of the "velocity" of weights moving, and using the latest gradient to update "velocity", and use the "velocity" to update weights. Thus it will accelerate gradient descent in the constant direction, but slow down in the jiggling direction.

Give basic Gradient Descent

$$\theta = \theta - \alpha \cdot \nabla L(\theta)$$

Gradient Descent with momentum will be

$$v_t = \gamma \cdot v_{t-1} + \alpha \cdot \nabla L(\theta) $$$$ \theta = \theta - v_t  $$

## RMSProp

**RMSProp** stands for "Root Mean Square Propagation". It adjust the learning rate for each parameter based on the recent magnitude of its gradients. And reaching a similar effect as
**Gradient Descent with Momentum**.
$$ s_t = \beta \cdot s_{t-1} + (1-\beta)(\nabla L(\theta))^2 $$
$$ \theta = \theta - \frac{\alpha}{\sqrt{s_t + \epsilon}} \cdot \nabla L(\theta) $$

## Adam

In short, **Adam** stands for "Adaptive Moment Estimation", and is a combination of **RMSProp** and **Gradient Descent with Momentum**.

## Mini Batch

Traditionally, model weights every time all samples have been fed to the model during training, which would lead to a smooth converging, but the training is relatively, especially when training set is more than millions. **Mini Batch**, instead, update weights every batch of samples got fed. The model weights might jiggle around for some steps, but would eventually converge.

The chosen batch size should be neither too small in order to take advantage of GPU computation, nor too big to get model weights moving faster. $2^n$ is usually chosen as batch size.

## Learning Rate Decay

Especially when doing Mini Batch training, model might have a hard time to converge. learning rate decay is an optimization in this scenario. By reducing rate gradually during training, parameters move faster initially, and slower as training goes.

$$ \alpha = \frac{k}{\sqrt{epoch}} \cdot \alpha_0$$

## Batch Normalization

As the neural network goes deeper, gradient vanish or explosion happens more than often. One observation is that in any given hidden layer, the distribution of hidden features is skewed. And similar to [Feature Scaling](#Feature%20Scaling) as a method of input normalization, we apply the same thing to hidden layers.

To compute mean $\mu$ and variance $\sigma^2$ for batch normalization:

$$ \mu_B = \frac{1}{m} \sum^m_{i=1}x_i, \ \ \sigma^2_B = \frac{1}{m} \sum^m_{i=1}(x_i - \mu_B)^2 $$

Obviously both of them depends on input value x, which is no such thing during inference. The typical solution on this is using running **average** of mean and variance (accumulated during training).

## Residual Layer

As the neural network goes deeper, the raw features or early hidden layers have way little impact on the eventual output. **Residual Layer** is a fairly simple solution for this problem. Data instead of flowing forward layer by layer, it will skip one or more layers and aggregated with deeper layers (AKA. skip connections). So for the residual layer, we will have

$$y = F(x) + x$$

Where $F$ is the "normal" behavior of the layer, and we apply the original input on top that.