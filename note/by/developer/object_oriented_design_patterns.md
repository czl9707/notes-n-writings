---
title: Object Oriented Design Patterns
tags:
  - design-pattern
created-date: 2025-11-10T19:55:51-05:00
last-updated-date: 2025-12-28T20:15:54-05:00
---

Note: Design pattern is building block of building applications. The key is identifying common problems, and using standard method to solve them.

## Behavior Patterns

Focusing on interactions and responsibilities of interacting object and classes.

### Strategy

**Strategy** pattern tries to solve the problem that the method of parent class is heavily overwritten by derived classes, while multiple derived classes have identical implementation.

Strategy pattern let developer define a family classes of implementation, and delegate the method behavior to them, to avoid messy method invocation through out inheritance chain.

``` csharp
abstract class Duck
{
	public abstract void MakeNoise();
}

class WhiteDuck: Duck { 
	public void MakeNoise() => Console.WriteLine("GA");
}

class BlackDuck: Duck { 
	public void MakeNoise() => Console.WriteLine("GA");
}

class RubberDuck: Duck { 
	public void MakeNoise() => Console.WriteLine("");
}

class BombDuck: Duck { 
	public void MakeNoise() => Console.WriteLine("Boom");
}
```

``` csharp
abstract class Duck
{
	protected abstract INoiseBehavior noiseBehavior { get; }
	public void MakeNoise() => noiseBehavior.perform();
}

interface INoiseStrategy { void perform(); }
class NormalNoiseStrategy: INoiseStrategy // ...
class SilentNoiseStrategy: INoiseStrategy // ...
class BoomNoiseStrategy: INoiseStrategy // ...

class WhiteDuck {
	protected INoiseStrategy noiseStrategy { get; } 
		= new NormalNoiseStrategy();
}
class BlackDuck // ...
class RubberDuck // ...
class BombDuck // ...
```

### Observer

The key idea of **Observer** is shifting from the downstream components asking for data to the upstream components pushing data (or least telling) to downstream.

Observer pattern consists of two sides of the data, the side providing data called **Observerable**/**Subject**/**Publisher**, the side taking data called, **Subscriber**/**Observer**.

Not much to demo, but the pattern can become pretty powerful and complex.

- One class can be both **Observer** and **Observerable**.
- Observer considering queued events.
- Concurrency model.

And the entire [reactiveX](https://reactivex.io/) library is built around **Observer** pattern.

### State

**State** pattern is closely related finite state machine. It lets an object alter its behavior when its internal state changes.

There are two components in state changing in general, event and current state. The traditional way of implement this includes looking up both of them in every time. While **State** pattern treat state as an interface having actions to each event.

``` csharp
interface IState {
	void Event1Hanlder(StateHolder holder);
	void Event2Hanlder(StateHolder holder);
	void Event3Hanlder(StateHolder holder);
} 

class State1: IState {
	public void Event1Hanlder(StateHolder holder) { ... }
	public void Event2Hanlder(StateHolder holder) { ... }
	public void Event3Hanlder(StateHolder holder) { 
		holder.setState(new State2());
	}
}

class State2: IState {
	public void Event1Hanlder(StateHolder holder) { ... }
	public void Event2Hanlder(StateHolder holder) { 
		holder.setState(new State1());
	}
	public void Event3Hanlder(StateHolder holder) { ... }
}
```

### Template Method

**Template Method** defines the skeleton of an algorithm in the superclass but lets subclasses override specific steps of the algorithm without changing its structure.

```csharp
public abstract class Template
{
	public Execute()
	{
		this.Func1();
		...
		this.Func2();
	}
	
	protected abstract void Func1();
	protected abstract void Func2();
}
```

The above version of implementation has a pitfall when the inheritance hierarchy growing deep, the real implementation of `Func1` and `Func2` become fuzzy throughout the deep chain.

A better implementation is combine this with [Strategy](#Strategy) pattern and mark the `Template` class as `final` or `sealed`. `Func1` and `Func2` become either properties or method parameter. One common example is sorting algorithm, almost all standard libraries in all language allow passing into comparison function to customize sorting behavior.

### Command

Some operation rely on numbers of parameters, and the structure of these parameters are subjected to change. **Command** pattern turns request parameters into a stand-alone object that contains all information about the request.

The pattern is very widely used in the industry. Most of web server expose the [HTTP](note/by/developer/network_protocols.md#HTTP) request and response as an object, since passing each of header, cookie, and other information as individual arguments won't scale well.

The `Command` object can contain more than just command parameters. Some implementation have an `execute()` function part of the `Command` interface, which let command itself handles command routing instead of having some other entity use a giant `switch` statement to push command to corresponding handler.

### Iterator

**Iterator** lets you traverse elements of a collection without exposing its underlying representation (list, stack, tree, etc.).

### Mediator

**Mediator** tries to solve the problem multiple peer object talking to each other without coordination. Mediator isolates the wiring among them from their independent behavior, however, the boundary is really hard to define.

### Memento

**Memento** is specialized to memorize object states.

### Visitor

**Visitor** lets you separate algorithms from the objects on which they operate. Therefore instead of having:

``` csharp
foreach (var node in tree)
{
	if (node.type == "A") PerformA();
	else if (node.type == "B") performB();
	...
}
```

Each operation can be isolated out together their the "accept" condition.

```csharp
interface INodeVisitor {
	bool Accept(Node node);
	void Perform(Node node);
}

public class NodeVisitorA: INodeVisitor {
	public bool Accept(Node node) => node.type == "A";
	public void Perform(Node node) => ...;
}

public class NodeVisitorB: INodeVisitor {
	public bool Accept(Node node) => node.type == "B";
	public void Perform(Node node) => ...;
}

public class Program {
	public static void Main() 
	{
		foreach (var node in tree)
		{
			foreach (var visitor in visitorCollection)
			{
				if (visitor.Accept(node)) 
					visitor.Peform(node);
			}
		}
	}
}

```

## Creational Patterns

When using `new` to instantiate an object randomly, the encapsulation of type is broken, meaning the instantiation of the object is depending on some other type.

Creational Patterns focus on instantiating objects in structured and controlled way and decoupling creation of objects from their usage.

### Factory Method

**Factory method** solves the problem of creating product objects without specifying their concrete classes. Factory method provides an interface for creating objects but allows subclasses to alter the type of an object that will be created.

``` csharp
abstract class Department {
    public abstract Employee createEmployee(int id);
}

class ITDepartment: Department {
    public Programmer createEmployee(int id) => new Programmer(id);
}

class AccountingDepartment: Department {
    public Accountant createEmployee(int id) => new Accountant(id);
}
```

### Abstract Factory

**Abstract Factory** is one level up from [Factory Method](#Factory%20Method) pattern. It is useful when the set of objects should be created together with certain relationship.

### Singleton

The idea of Singleton is really simple, the class should only have one instance. This pattern is heavily utilized in context of [Inverse of Control](note/by/developer/Inverse_of_control.md).

There are multiple ways to implement this though. Dependency Injection in Dotnet is letting framework to handle this. Another way is marking constructor as `private` and only exposing a static function with caching mechanism to ensure one instance. And there are two variation, eager instantiation and lazy instantiation.

Interestingly, Singleton is almost an religious problem in Python, there are multiple ways of implementing this, and some discourage that in Python. But it is a good opportunity to practice [Meta Programming](note/by/developer/drafts/python_meta_programming.md) in Python.

``` python
class Singleton(type):
    _instances = {}
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(Singleton, cls).__call__(*args, **kwargs)
        return cls._instances[cls]

class Logger(metaclass=Singleton):
    ...
```

### Prototype

**Prototype** pattern encourages copying existing objects without making your code dependent on their classes. The copy operation is often referred as "clone".

Java has `Cloneable` and C# has `ICloneable`, but neither of them is in good shape, (implicit shallow copy & deep copy). Defining a special constructor or a static method to achieve so is common.

Prototype pattern is not that relevant in C++, because of well defined [Copy Operation](note/by/developer/cpp_lvalue_rvalue.md#Copy). However it still have its use case when facing polymorphic cloning.

### Builder

**Builder** pattern constructs complex objects step by step. The pattern allows you to produce different types and representations of an object using the same construction code.

Dotnet heavily utilize builder pattern for constructing several core classes.

``` csharp
IConfiguration configuration = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables()
    .AddUserSecrets()
    .Build();
```

## Structural Patterns

Focusing on composition of classes or objects into larger or more complex structures.

### Decorator

**Decorator** pattern wraps the internal class, providing extra functionality, while maintaining the same interface.

Decorator Pattern lets you attach new behaviors to objects by placing these objects inside special wrapper objects that contain the behaviors. It also help delegate the overlapped part of derived classes out to another class, and also give the flexibility to compose the behavior at runtime, while maintaining the interface unchanged.

``` csharp
public interface IBurger
{
	int getPrice();
}

public class Burger: IBurger { public int getPrice() => 2; } }
public class DoubleLayerBurger: IBurger
{
	private IBurger decoratee;
	public DoubleLayerBurger(IBurger decoratee)
	{
		this.decoratee = decoratee;
	}
	public int getPrice()
	{
		this.decoratee.getPrice() * 2;
	}
}

public class ExtraCheeseBurger: IBurger { /*...*/ }
public class LargeSizeBurger: IBurger { /*...*/ }

public class Program
{
	public static void main()
	{
		IIBurger burger = new Burger();
		burger = new DoubleLayerBurger(burger);
		burger = new ExtraCheeseBurger(burger);
		burger = new LargeSizeBurger(burger);
		
		burger.getPrice();
	}
}

```

### Facade

Facade pattern defines a wrapper around a complex system, to provide a simplified interface to end user.

### Adapter

Adapter pattern is similar to [Facade](#Facade), from the aspect of wrapping behavior. However, the purpose is connect the underlying class to an incompatible interface, instead of hide the complexity of it.

### Proxy

**Proxy** pattern shares the same structure as [Decorator](#Decorator), while they mean for different purposes. The purpose of proxy pattern is access control to the wrapped object while maintaining the same interface, some common usage includes lazy loading, caching, and auditing.

### Composite

**Composite** pattern allows for composing a list or tree of objects with same interface into an individual one. So that both leaf and composite objects can share same interface. The leaf take the responsibility of business logic, and the composite is in charge of dealing with aggregation on top of children objects.

``` csharp
interface IFileSystemNode { void show(); }

class File: IFileSystemNode
{
	private string name;
	public File(string name) => this.name = name;
	public show() => Console.WriteLine(this.name);
}

class Directory: IFileSystemNode
{
	private string name;
	private IEnumerable<IFileSystemNode> children;
	public Directory(string name, IEnumerable<IFileSystemNode> children) 
	{
		this.name = name;
		this.children = children;
	}
	public show()
	{
		foreach (var child in this.children)
		{
			child.show();
		}
	}
}
```

### Flyweight

**Flyweight** pattern is a very specialized pattern, trying to fit more objects into the available amount of RAM by sharing common parts of state between multiple objects instead of keeping all of the data in each object.

Flyweight Pattern add some level implementation complexity. Thus applying this pattern really becomes a trade off between RAM and code complexity (potentially CPU cycles).

### Bridge

**Bridge** pattern splits a large class or a set of closely related classes into two separate hierarchies—abstraction and implementation—which can be developed independently of each other.

It is somewhat similar to [Strategy](#Strategy). While Strategy pattern focuses more on flexibility and the scalability of the "strategy" part, Bridge pattern not really emphasis a lot on the dynamic aspect of it, and allow scaling on both end.