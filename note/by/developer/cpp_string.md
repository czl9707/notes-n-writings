---
title: String in C++
tags: [cpp]
created-date: 2025-10-28T00:00:00-04:00
last-updated-date: 2025-11-28T13:07:32-05:00
---

## Dynamic Memory Allocation

`std::string` is similar to `std::vector<char>` from the aspect of memory management. It allocates contiguous space on heap for characters, grows the space geometrically when number of char goes beyond space allocated, and copy contents across.

## Small String Optimization

Most of C++ compilers implement **Small String Optimization (SSO)**. It refers to putting the entire string on stack when the size of the string is small, usually smaller than 16 characters.

## C String

In **C**, string is managed in a non-trivial way. String is a `char[]` with a `\0` at the end to signal the termination of the string.

To support the interoperability with c string, `std::string` also follow the convention.

```cpp
int main() {
    const char* cstr = "hello";
    std::string s(cstr);
	
	s.c_str(); // Getting C string, type as char*.
	
	std::string s2 = cstr; // implict conversion.
}
```