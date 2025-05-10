---
title: 5 WTF Moments in Python
description: This isn't another Python beginner guide or critique of Python's performance issues. Instead, the blog walks through five surprising behaviors in Python that have bitten me in the past, knowing these might save you hours of debugging.
link: 5_wtf_moments_in_python
cover_url: https://zane-portfolio.s3.us-east-1.amazonaws.com/PythonNightmareCover.png
---
## 1. It Is Not the Function I Called!

I encountered this issue when implementing the [Decorator Pattern](/as/developer/blog/decorator_design_pattern) in python. 

```python
callbacks = [
	callback1,
	callback2,
	callback3,
]
wrapped = []

for callback in callbacks:
	def wrapped_callback(*args, **kwargs):
		print(f"{callback.__name__} is invoked.")
		callback(*args, **kwargs)
        
	wrapped.append(wrapped_callback)

for wrapped_cb in wrapped:
		wrapped_cb()
```

```bash
callback3 is invoked.
callback3 is invoked.
callback3 is invoked.
```

Surprised? This would likely break heads of developers famaliar with other languages. The rationale, however, is not complex. When defining function in Python, variables inside the closure are **captured by reference**, not by value. This means the values of `callback` in each `wrapped_callback` are resolved during execution time, not definition time. When the interpreter looks up the value of `callback` for each `wrapped_callback`, `callback` always holds the value of `callback3`, since it ended up with the value when exiting the loop.

To avoid this, simply avoid defining function inside loops.

```python
callbacks = [
	callback1,
	callback2,
	callback3,
]

wrapped = []
def wrap_callback(callback):
	def wrapped(*args, **kwargs):
		print(f"{callback.__name__} is invoked.")
		callback(*args, **kwargs)
		
	return wrapped

for callback in callbacks:
    wrapped.append(wrap_callback(callback ))

for wrapped_cb in wrapped:
	wrapped_cb()
```

```python
callback1 is invoked.
callback2 is invoked.
callback3 is invoked.
```

As a side note, be careful when using `lambda` functions in Python as well. They're convenient but can cause the same problem if used inappropriately.

```python
funcs = [lambda: print(f"No.{i}") for i in range(3)]
for func in funcs:
	func()
```

```bash
No.2
No.2
No.2
```

## 2. Mutable Default Function Parameters Can Bite you

If you ever used default parameter in compiled languages like C#, the compiler forced the default value to be a compile time value. Although Python is an interpreted language, it still binds the default value at the function definition time, which means the default value got created only once. If the value is mutable and gets modified, subsequent calls will use the modified value.

```python
def append_1_to_list(l = []):
	l.append(1)
	print(l)
		
append_1_to_list()  # [1]
append_1_to_list()  # [1, 1]
```

Solution? Avoid this pattern. If you really need this, make it default to `None` and intialize the value in function body.

## 3. “Finally” Is Literally Your Final Behavior

```python
def will_throw():
	try:
		raise Exception()
	finally:
		return "Will you see me?"

will_throw() # 'Will you see me?'
```

Python silently eats the exception! This is more than confusing. I haven't found a satisfying explanation for why this happens. But the behavior here is that, the interpreter stores the error temporarily before the `finally` statement executed. If a `return` statement appears in `finally`, the exception will be discarded.

Similarly, `finally` is remarkably greedy, it will even discarded your previous return value if any.

```python
def who_should_i_see():
	try:
		return "You should see me."
	finally:
		return "Will you see me?"

who_should_i_see()  # 'Will you see me?'
```

## 4. The Method Is not the Method

```python
class MyClass:
	def the_method(self): pass

obj = MyClass()
obj.the_method is obj.the_method  # False
```

To understand this behavior, let's examine what happens under the hood when we use `obj.the_method`. 

Instead of solving the puzzle directly, try answer another question, what is `self` meant for in the method parameter? We are taught that `self` representsthe object the method is bound to, which is why `self` doesn't appear in the method signature when we call methods on objects. Who  fill the `self` parameter with the object? Magic, and it happened when the method is accessed or called.

This binding happens every time we access `obj.the_method`, creating a new method object from the function definition and the bound object every time. This explains why `obj.the_method is obj.the_method` evaluates to `False`.

While we won't dive deeper in this post, it's worth learning about this comprehensively. Python object attributes use something called [Discriptor](https://docs.python.org/3/howto/descriptor.html#pure-python-equivalents) to control access behavior, which is where the magic happens. Then [Python official doc](https://docs.python.org/3/howto/descriptor.html#pure-python-equivalents) is the best place to learn more. 

## 5. True Is an Integer

```python
isinstance(True, int)  # True
isinstance(True, bool)  # True
```

Surprise again! Booleans are integers! Both `True` and `False` and instances of both `bool` and `int`. You might wonder about the relationship between `bool` and `int`.

```python
issubclass(bool, int)  # True
issubclass(int, bool)  # False
```

Yeah, `bool` is a subclass of `int`. It's hard to believe that a "modern language" would have this quirk. But remember, Python is 32-year-old man, at least older than me. Python was created without a boolean type, just like old C, and developers historically use 0 and 1 instead. For the backward compatibility, `bool` became a subclass of `int` when it was introduced.