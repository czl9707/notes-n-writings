---
title: Object Oriented Design Patterns
tags: [design-pattern]
created-date: 2025-11-10T19:55:51-05:00
last-updated-date: 2025-11-10T21:12:28-05:00
---

Note: Design pattern is building block of building applications. The key is identifying common problems, and using standard method to solve them.

## Behavior Patterns

Focusing on interactions and responsibilities of interacting object and classes.

### Strategy Pattern

**Strategy Pattern** tries to solve the problem that the method of parent class is heavily overwritten by derived classes, while multiple derived classes have identical implementation.

Strategy Pattern let developer define a family classes of implementation, and delegate the method behavior to them, to avoid messy method invocation through out inheritance chain.

``` c#
abstract class Duck
{
	public abstract void MakeNoise();
}

class WhiteDuck: Duck { 
	public void MakeNoise() { Console.WriteLine("GA");  } 
}

class BlackDuck: Duck { 
	public void MakeNoise() { Console.WriteLine("GA");  } 
}

class RubberDuck: Duck { 
	public void MakeNoise() { Console.WriteLine("");  } 
}

class BombDuck: Duck { 
	public void MakeNoise() { Console.WriteLine("Boom");  } 
}
```

``` c#
abstract class Duck
{
	protected abstract INoiseBehavior noiseBehavior { get; }
	public void MakeNoise() { noiseBehavior.perform() }
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

### Observer Pattern

The key idea of **Observer Pattern** is shifting from the downstream components asking for data to the upstream components pushing data (or least telling) to downstream.

Observer Pattern consists of two sides of the data, the side providing data called **Observerable**/**Subject**/**Publisher**, the side taking data called, **Subscriber**/**Observer**.

Not much to demo, but the pattern can become pretty powerful and complex.

- One class can be both **Observer** and **Observerable**.
- Observer considering queued events.
- Concurrency model.

And the entire [reactiveX](https://reactivex.io/) library is built around **Observer Pattern**.

## Creational Patterns

Focusing on instantiating objects and decoupling creation of objects from their usage.

## Structural Patterns

Focusing on composition of classes or objects into larger or more complex structures.

### Decorator Pattern