---
title: Python Property Acess
tags: [python]
created-date: 2025-08-30T00:00:00-04:00
last-updated-date: 2025-10-15T20:21:26-04:00
---

When doing something like `obj.attr`, there are a lot of things happened behind the scene. There are multiple way one attribute can be accessed, through [Descriptor](#Descriptor), `__dict__` look up, `__getattr__()` access and etc.

## Order of Invocation

- Invoke the first data descriptor in [Inheritance Chain](note/by/developer/python_inheritance.md) if available.
- Perform `__dict__` lookup through out Inheritance Chain.
- Invoke the first non-data descriptor in Inheritance Chain if available.
- Class variable level lookup.
- Invoke `__getattr__()` if provided.
- Raise an `AttributeError`

Everything before invoking `__getattr__()` is wrapped in the `__getattribute__()` hook. In another word, directly calling `obj.__getattribute__(name)` will skip the `__getattr__` entirely.

## Descriptor

Descriptor does not refer to any class or [meta class](note/by/developer/drafts/python_meta_programming.md). Any object provide any one of below is considered as a **descriptor**.

- `def __get__(self, obj, type=None)`
- `def __set__(self, obj, value)`
- `def __delete__(self, obj)`

### Data Descriptor & Non-Data Descriptor

If a descriptor has `__set__` or `__get__` defined, it is treated as a **Data Descriptor**. If it only has `__get__` defined, it is a **Non-Data Descriptor**.

### `__set_name__`

The hook allow dynamically access property name got associated to the descriptor.

``` python
class DummyDescriptor:
    def __set_name__(self, owner, name):
        self.private_name = '_' + name

    def __get__(self, obj, objtype=None):
        return obj.__dict__[self.private_name]

    def __set__(self, obj, value):
        obj.__dict__[self.private_name] = value
```

## Dynamic Attribute Access Methods

`__getattr__`, `__setattr__` and `__delattr__` are the final guard on the attribute accessing chain. And it allow accessing underlying data dynamically.

``` python
class Proxy:
	def __init__(self,obj):
		self._obj = obj

	def __getattr__(self,name):
		print('getattr:', name)
		return getattr(self._obj, name)
```

## `__slot__`

If `__slot__` is defined, it will become a replacement for `__dict__`, all default data lookup routed to `__slot__`. `__slot__` is faster in access performance, and smaller in memory foot print, but way less flexible. Anything data not having `__slot__` defined will error out. And some standard library like `@cached_property()` is explicitly rely on `__dict__`, which would crash if used together with `__slot__`.

```python
class Slotted:
	slot = ("a", "b")
	
	def __init__(self, a, b, c):
		self.a = a
		self.b = b
		self.c = c # this will throw exception.
```

## Method Binding

Descriptor is involved pretty much every moment in python. One example would be method binding, that's why when defining method in python, the first argument is always `self`, which refers to the object that the function is invoked upon.

So every time the function being accessed, a new bound method will be created.

```python
class MyClass:
	def the_method(self): 
		pass

obj = MyClass()
obj.the_method is obj.the_method  # False
```

And when the accessing the method from the class level would require us passing in the first argument manually.

```python
obj = MyClass()
MyClass.the_method(obj)
```

### Static Method, Class Method, Property

Given the above understanding about descriptor, the `@staticmethod`, `@classmethod` and `@property` are decorators that yield different descriptors.

A Pure naive python equivalent to implement `@staticmethod`.

```python
class StaticMethod:
    def __init__(self, f):
        self.f = f

    def __get__(self, obj, objtype=None):
        return self.f

    def __call__(self, *args, **kwds):
        return self.f(*args, **kwds)
        
def staticmethod(f):
	return StaticMethod(f)
```