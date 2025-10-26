---
title: Inverse of Control
tags: [design-pattern]
created-date: 2025-09-11T17:29:35-04:00
last-updated-date: 2025-10-26T09:26:35-04:00
---

**Inverse of Control** is a design principal of managing code dependencies. It stands on the opposite side of traditional control, where the constructor of dependencies are called by developer in code directly. Inverse of Control suggest letting framework or container to manage the lifecycle of dependencies.

The pain points of traditional control:

- Classes are hard to rest when dependencies are constructed inside, either in constructor or method.
- Dependencies lifecycle are hard to manage when dependencies are constructed inside other classes.
- When moving all constructor call to somewhere closer to main function, the construction of all dependencies becomes complex, especially when some needs to be Singleton, while some not.

## Service Locator

Service Locator is a pattern that registering all dependencies constructing method into a container by some kind of key. Instead of constructing dependencies directly, we request it from the container using the key.

``` C#
class Worker
{
    private Wrench wrench;
    public Worker(Wrench wrench)
    {
        this.wrench = wrench;
    }
    public Item Fix(Item item)
    {
        this.wrench.Repair(item);
        return item;
    }
}

class Wrench
{
    public Wrench() { }
    public void Repair(Item item) {...}
}
```

``` C#
var serviceCollection = new ServiceCollection();
serviceCollection.AddSingleton<Worker>();
serviceCollection.AddSingleton<Wrench>();

var services = serviceCollection.BuildServiceProvider();
var worker = services.GetRequiredService<Worker>();
worker.Fix(item);
```

## Dependency Injection

Dependencies Injection is a pattern refers to avoiding construct dependency inside class. Instead, there are multiple different approaches to get the way to inject the dependencies into target classes.

- Properties Injection.
- Method parameters Injection.
- Constructor Injection.

``` C#
// Properties Injection
var worker = new Worker();
worker.wrench = new Wrench();
worker.Fix(item);

// Method Prarameters Injection
var worker = new Worker();
worker.Fix(item, new Wrench());

// Constructor Injection
var worker = new Worker(new Wrench());
worker.Fix(item);
```

Dependency Injection itself provides a better testability. By defining dependencies type as Interface, they can be easily to mock up, so that the target class logic is isolated and ready for unit testing.

## Not a Thing in Some Language

While Inverse of Control is pretty dominant in some language like C# and Java, it is not that popular in language like Python.

The reason behind is that dynamic language like Python not really having the trouble of mocking functions. Python's duck typing principal, and its flexible [import system](note/by/developer/python_import_system.md) allow easy mocking of most of stuff, even built-in libraries. Thus dependencies Injection become an overkill in a some cases.