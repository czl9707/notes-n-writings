---
title: C++ Constructor
tags: [cpp]
created-date: 2025-10-31T00:08:48-04:00
last-updated-date: 2025-11-02T22:15:10-05:00
---

C++ has a surprising number of types of constructor. Understanding the majority of them is necessary to nail the memory control aspect of the language.

## Default Constructor

A default constructor is a constructor with no declared parameters.

When no default constructor is defined by user, the compiler will implicit define one marked as `inline public`.

- The generation is disabled when any member misses default constructor.
- Inside the constructor, each field's default constructor is called.

## Member Initialization

Some member of the class is `const`, but still need some initialization logic. **Member Initialization** gives a way to assign them value before the constructor logic kicks in.

``` c++
class MyClass
{
private:
	int a, b, c;
public:
	MyClass(): a(1), b(2), c(3) {}
}
```

To understand this better, `a(1)` somehow like preforming `int a(1)` before executing the constructor logic.

## Deleted & Defaulted Constructor

Deleted constructor is meant for stop compiler from implicitly generating a specific constructor. Technically `delete` can be used on any function, but this is widely used on [Default Constructor](#Default%20Constructor), [Copy Constructor](#Copy%20Constructor), [Move Constructor](#Move%20Constructor) and etc., when the implicit behavior is not desired. One good example would be [Unique Pointer](note/by/developer/drafts/cpp_smart_pointer.md#Unique%20Pointer), copy constructor is deleted to prevent memory leak.

Defaulted Constructor is meant for make compiler's implicit constructor generation become a bit more explicit. Or it can force compiler to generate the constructor when the generation condition is not met.

```c++
class MyClass
{
public:
	MyClass() = default; // Explicit declaring default constructor.
	MyClass(MyClass& myClass) = delete; // Delete copy constructor.
}
```

## Copy Constructor

Copy constructor is the constructor take one parameter, which is `T`, `T&`, `const T&`. Copy Constructor is called when an object is constructed from [Left Value](note/by/developer/drafts/cpp_lvalue_rvalue.md#Left%20Value%20&%20Right%20Value) of another object with same type, value is [copied](note/by/developer/drafts/cpp_lvalue_rvalue.md#Copy) and duplicated.

When no copy constructor is defined by user, the compiler will implicit define one marked as `inline public`.

- The generation is disabled if the class any of following defined by user:
	- destructor
	- [copy assignment operator](note/by/developer/drafts/cpp_lvalue_rvalue.md#Copy%20Assignment)
- The generation is disabled if any member misses a copy constructor.
- Inside the constructor, each field's copy constructor is called.

## Move Constructor

Move constructor is the constructor take one parameter, which is `T&&`, `const T&&`. Move constructor is called when an object is constructed from [Right Value](note/by/developer/drafts/cpp_lvalue_rvalue.md#Left%20Value%20&%20Right%20Value) of another object with same type. The value is [moved](note/by/developer/drafts/cpp_lvalue_rvalue.md#Move) over without duplicating.

When no constructor is defined by user, the compiler will implicit define one marked as `inline public`.

- The generation is disabled if the class any of following defined by user:
	- destructor
	- [copy assignment operator](note/by/developer/drafts/cpp_lvalue_rvalue.md#Copy%20Assignment)
	- [copy constructor](#Copy%20Constructor)
	- [move assignment operator](note/by/developer/drafts/cpp_lvalue_rvalue.md#Move%20Assignment)
- The generation is disabled if any member misses a move constructor.
- Inside the constructor, each field's move constructor is called.

## Converting Constructor

Any constructor with one argument defined is a converting constructor. If the constructor is marked as `explicit` it won't support [Implicit Type Conversion](note/by/developer/drafts/cpp_type_convertion.md#Implicit%20Type%20Conversion).

``` c++
class MyClass
{
public:
	MyClass(int i){} // Allow conversion from i;
	explicit MyClass(std::string s){} // Do not allow implicit conversion. Only allow explicit static cast.
}

int main()
{
	MyClass a = 1;
	// MyClass b = "something"; won't work.
	MyClass c = (MyClass)1;
	MyClass d = (MyClass)"something";
}
```

## Delegating Constructor

Delegating Constructor allow one constructor calling another constructor.

``` c++
class MyClass: public ParentClass
{
public:
	MyClass(int a, int b) : ParentClass() {}
	MyClass(int a) : MyClass(a, 1) {}
}
```

## List Initialization Constructor

List Initialization has two form **Direct List Initialization** and **Copy List Initialization**, they reference to initializing the object in place or having a "[copy](note/by/developer/drafts/cpp_lvalue_rvalue.md#Copy)" involved. But the difference is boiled down to that if the underneath constructor is marked as `explicit`, then it does support Copy List Initialization.

``` c++
MyClass mc1{arg1, arg2}; // Direct Initialization
MyClass mc2 = {arg1, arg2}; // Copy Initialization
```

When calling constructor in List Initialization fashion, the compiler will consider different options:

- A constructor declared with one argument with type as `std::initializer_list<T>`.
- A constructor declared with same number of arguments with type matches, considering defaulted arguments.
- If the target is an aggregate, the number and order of arguments matches ones of its member declaration. A class type is an aggregate if:
	- no user-declared constructors
	- no private/protected non-static data members
	- no virtual base classes or virtual functions
	- no base class that isn’t an aggregate

``` c++
struct MyStruct{ int a; std::string b; }
class MyClass {
	MyClass(std::string a, int b) {}
}
class MyClass2 {
	MyClass2(std::initializer_list<int> list) {}
}

int main()
{
	MyStruct ms{ 1, "something" };
	MyClass mc{ "something", 1 };
	MyClass2 mc2{ 1, 2, 3, 4 };
}
```