---
title: Left Value & Right Value
tags: [cpp]
created-date: 2025-11-02T17:02:42-05:00
last-updated-date: 2025-11-08T16:27:46-05:00
---

## Left Value & Right Value

Left Value or `lvalue` refers to the value having an address can reference to. From the code aspect, it usually means a value with a name associated.

Right Value or `rvalue` refers to a temporary value that cannot reference using an address. From coding perspective, it is usually a literal value we put on the right side of the `=` or directly passed into function.

Right value can be bound as `const` left value, but not left value. To convert left value to right value, `std::move` has to be called.

``` c++
struct Dummy {};
class MyClass
{
public:
    void func1(Dummy&);
    void func2(const Dummy&);
    void func3(Dummy&&);
};

int main()
{
    MyClass obj;
    Dummy dummy;

    obj.func1({}); // Error: Cannot bind lvalue to rvalue reference
    obj.func1(dummy);

    obj.func2({});
    obj.func2(dummy);
   
    obj.func3({});
    obj.func3(dummy); // Error: Cannot pass in a lvalue as a rvalue
    obj.func3(std::move(dummy));
}
```

## Copy

Copy operation happens when creating data from left value to left value.Few examples:

- Passing value to a function which take left value as parameter - `void func(MyClass obj)`.
- Constructing an object from another left value object - `MyClass obj(another);`.
- Capturing value returned by a function return left value - `return obj;`.
- Assigning non-right-value variable - `MyClass obj = other;`.

### Copy Constructor

A user defined Copy Constructor can customize constructing new object through copying.

```c++
class MyClass
{
public:
	// Any One of below;
	MyClass(MyClass);
	MyClass(MyClass&);
	MyClass(const MyClass&);
}
```

### Copy Assignment

A user defined Copy Assignment Operator can customize assigning object through copying.

```c++
class MyClass
{
public:
	// Any One of below;
	MyClass& operator=(MyClass);
	MyClass& operator=(MyClass&);
	MyClass& operator=(const MyClass&);
}
```

## Move

Move operation happens when creating data from right value to left value. Few examples:

- Passing right value to a function which take left value as parameter - `void func(MyClass obj)` where `a.func({...})`.
- Constructing an object from a temporary object - `MyClass obj({...});`.
- Assigning from right value - `MyClass obj = std::move(other);`.

### Move Constructor

Similar to [Copy Constructor](#Copy%20Constructor).

```c++
class MyClass
{
public:
	// Any One of below;
	MyClass(MyClass&&);
	MyClass(const MyClass&&);
}
```

### Move Assignment

Similar [Copy Assignment](#Copy%20Assignment).

```c++
class MyClass
{
public:
	// Any One of below;
	MyClass& operator=(MyClass&&);
	MyClass& operator=(const MyClass&&);
}
```
