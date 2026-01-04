---
title: Pytorch
tags:
  - machine-learning
created-date: 2025-09-24T17:45:25-04:00
last-updated-date: 2025-12-28T20:21:34-05:00
---

## Tensor

`Tensor` is similar to `narray` in [numpy](https://numpy.org/) in a lot of aspects. The key difference is that `Tensor` is responsible to capture all operation during model forward pass, and store the gradient as part of itself. And by calling `backward()` on the last `Tensor` of the compute graph, the gradient descent can be applied recursively throughout the whole graph.

## Module

`Module`s are building blocks of a neural network, and pytorch provided a lot of predefined layers out of box, such as [Dropout](note/by/developer/variance_n_bias.md#Dropout%20Regularization), [Convolution Layer](note/by/developer/convolutional_neural_network.md#Convolution%20Layer), [LSTM](note/by/developer/recurrent_neural_network.md#Long%20Short%20Term%20Memory%20(LSTM)) and types of [Activation Functions](note/by/developer/machine_learning_basic.md#Activation%20Function).

``` python
import torch.nn as nn
model = nn.Sequential(
	nn.Linear(L1, L2),
	nn.Relu(),
	nn.Dropout(.1),
	nn.Linear(L2, L3),
	nn.Softmax(dim=1),
)
```

And it is fairly common that `Sequential` is not enough for our use case, so we will define custom module which extra logic inside.

```python
import torch.nn as nn

class MyModule(nn.Module):
	def __init__(self):
		super().__init__()
		self.layer1 = ...
		self.layer2 = ...
	
	def forward(self, arg1, arg2):
		return self.layer1(arg1) + self.layer2(arg2)
```

`Module` record all `Tensor` assigned as instance properties, and associate them with names, which ends up in the `state_dict`. Therefore, calling super class constructor is mandatory before assigning any model parameter to the instance.

## Optimizer

`Optimizer` is referring to the training optimization such as [RMSProp](note/by/developer/training_optimization.md#RMSProp) and [Adam](note/by/developer/training_optimization.md#Adam).

``` python
opimizer = AdamW(model.parameters(), lr=3e-4)

for batch in dl:
	...
	loss.backward()
	optimizer.step()
```

`Optimizer` gets reference to the `Tensor`s of model weight through its constructor, and as mentioned above `Tensor` store the gradient as part of its structure. So that the `Optimizer` can record, and manipulate the gradient separately, which might seem like magic in first place.

## Scheduler

Scheduler takes the responsibility of [Learning Rate Decay](note/by/developer/training_optimization.md#Learning%20Rate%20Decay), and way it decays. Some default options are `LinearLR`, `ReduceLROnPlateau` and etc.

## Device

Used when the machine have more than a simple CPU. By setting the device as `cuda` or something else, and do `ts.to(device=device)`, the `Tensor` is moved to ram on different device, and same applies to model.

## Data

`DataSet` and `DataLoader` are standard way to loading and manipulating data. It might be ok to load all data into memory when the data set is less than 100MB, but this will grow very in-feasible when dataset grow beyond that, especially when dataset is non-local.

### Dataset

``` python
from torch.utils.data import Dataset

class MyDataSet(Dataset):
	def __init__(self, *args, **kwargs):
		...
		
	def __len__(self):
		...
	
	def __getitem__(self, idx: int):
		...
```

A `Dataset` class should implement `__init__`, `__len__` and `__getitem__` to satisfy its usage. While the `__getitem__` would only be called on single number index.

### DataLoader

``` python
from torch.utils.data import DataLoader, random_split

mydataset = MyDataSet()
train_ds, test_ds = random_split(mydataset, (.8, .2))

train_dl = DataLoader(train_ds, batch_size=32, shuffle=True)
test_dl = DataLoader(test_ds, batch_size=32, shuffle=True)

for batch in train_dl:
	print(len(batch)) # 32
```

`DataLoader` is a wrapper around `Dataset`, which providing functionality of batching. As mentioned above, samples are always retrieved one by on from `Dataset`, `DataLoader` would combine single samples into batches, if each item in `Dataset` is a dictionary, each key will be concatenated separately.

## Model Sharing

### Saving State Dict

Pytorch provide `torch.save` and `torch.load` method for model saving and loading. It is usually used together with `model.state_dict()` to save model check points, but can always be used to save extra model parameters.

``` python
torch.save({
	"state_dict": model.state_dict(),
	"labels": model.config.labels,
}, "weights_and_config.pt")

# On the loading side.
checkpoint = torch.load("weights_and_config.pt")
model = MyModel()
model.config.labels = checkpoint["labels"]
model.load_state_dict(checkpoint['state_dict'])
model(**input_args)
```

On drawback is that, model definition should be kept together with the loading script, which might be subjected to change.

### Saving Model Trace

`torch.jit` module is used for saving model as a whole.

``` python
scripted = torch.jit.trace(model, example_input)
torch.jit.save(scripted, "traced_model.pt")

# On the loading side.
model = torch.jit.load("traced_model.pt")
model(**input_args)
```

`torch.jit.trace` convert the model to a script, by tracking the `example_intput` all the way down and recording all operations. Therefore, the scripted module is decoupled from the model constructed previously, it only supports forward propagation, and means for deployment.