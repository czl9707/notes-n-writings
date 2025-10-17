---
title: Python Inheritance
tags: [python]
created-date: 2025-08-30T00:00:00-04:00
last-updated-date: 2025-10-16T22:29:10-04:00
---

The inheritance behavior is quite different in python comparing to may other languages. One key different is it supports multi inheritance.

```python
class MyClass(ClassA, ClassB):
	...
```

## `super()`

C# use `base` to refer to parent class, while C++ use `ParentClass::func()`. Given the fact that python supports multi inheritance, what exact does `super()` mean? It refers to the next class definition in the inheritance chain or called [Method Resolution Order (MRO)](#Method%20Resolution%20Order), and It always refers the `__mro__` the `super()` got called on.

```python
class A:
	def funcA(self):
		# assuming A will be inherited together 
		# with something with funB defined.
		return super().funcB()

class B:
	def funcB(self):
		return 1

class C(A, B):
	pass

c = C()
c.funcA() # 1
```

`super()` returns back a proxy, which allows us [access property](note/by/developer/python_property_access.md) on the entire inheritance chain. So the behavior of `super()` depends on two things, in which class it is being called, and the inheritance tree from which it is being called.

Printing out `super()` will give back `<super: <class 'SomeClass'>, <SomeClass some_object>>`. In fact `super` has multiple overloads to explicitly construct the proxy:

- `super()`
- `super(type)`
- `super(type, obj)` requires `isinstance(obj, type)`
- `super(type, type2)` requires `issubclass(type2, type)`

The rest would probably not that frequently used, but they would be very useful when doing [meta programming](note/by/developer/drafts/python_meta_programming.md).

## Method Resolution Order

As mentioned above, python support multiple inheritance. One question to answer would be, which class goes first? Although computing the resolution order is non-trivial, but we can access it through `__mro__` or `mro()`.

``` python
class A:
    def __init__(self):
        super().__init__()

class B:
    def __init__(self):
        super().__init__()

class C(B):
    def __init__(self):
        super().__init__()

class MyClass(A, C):
    def __init__(self):
        super().__init__()

MyClass.__mro__ # (<class '__main__.MyClass'>, <class '__main__.A'>, <class '__main__.C'>, <class '__main__.B'>, <class 'object'>)
```