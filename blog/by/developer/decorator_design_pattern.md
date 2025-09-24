---
cover: Media/DecoratorPatternCover.svg
title: "Code like an Onion: The Decorator Pattern"
description: An introduction to the Decorator Design Pattern, which helps manage cross-cutting concerns by wrapping your core functionality like an onion🧅.
tags: [design-pattern, python]
featured: false
created-date: 2025-07-05T00:00:00-04:00
last-updated-date: 2025-09-12T16:50:26-04:00
---

When cutting an onion, the knife slices through layer after layer, and finally reaches its core. The **Decorator Pattern** provides us a way of writing code just like cutting through an onion, not in the way of tearing 😢.

## The Problem: Inheritance Not Always the Solution.

Defining a base class and having child classes implement their own specific behavior is one of the basic ideas we learn when first learning OOP. As we implement more child classes, we tend to extract common pieces into their parent class. This seems elegant at first, but it often evolves into a complex inheritance tree, which requires a steep learning curve to understand and potentially leads to code duplication.

![Inheritance Tree Evolution](Media/InheritanceTreeComplexity.svg)

## What is Decorator Pattern?

> **Gang of Four Definition**: *The Decorator Pattern attaches additional responsibilities to an object dynamically. Decorators provide a flexible alternative to subclassing for extending functionality.*

If you ever tried peeling an onion layer by layer, you'll notice that no matter how many layers you peel away, it still looks like an onion! Similarly, the **Decorator Pattern** wraps the original object without changing its public interface, but enhances its capabilities. And, just like the onion, one object can be decorated multiple times.

## Example: Food Order Processor

Let’s take a simple food ordering service as an example and see how we can benefit from it.

We start with one base class, and different food types inherit from it to implement their own specific processing logic:

```python
from abc import ABC, abstractmethod 

class AbstractOrderProcessor(ABC):
    @abstractmethod
    def process(self, order: Order, context: Context) -> Response:
        ...

class IceCreamOrderProcessor(AbstractOrderProcessor):
    def __init__(self, storage: Storage, fridge: Fridge) -> None:
				self.storage = storage
				self.fridge = fridge
    
    def process(self, order: IceCreamOrder, context: Context) -> Response:
        items = self.storage.retrieve(order.items)
        ice_cream = self.fridge.prepare(items)
        ... # more logic here

# class BakeryOrderProcessor(AbstractOrderProcessor):      
# class PizzaOrderProcessor(AbstractOrderProcessor):
# And we will have more
```

After few weeks of development, a lot have happened, and let’s take a look at the `IceCreamOrderProcessor` again.

```python
class IceCreamOrderProcessor(AbstractOrderProcessor):
    def process(self, order: IceCreamOrder, context: Context) -> Response:
        try:
            logger.info(f"Start processing IceCream Order {order.id}")
						
            with (
                transaction.atomic() as trans,
                metric.timer() as span,
            ):
                items = self.storage.retrieve(order.items)
                ice_cream = self.fridge.prepare(items)
                ... # more logic here
                
            return GoodResponse()
        except Exception as ex:
            logger.error(f"Encounter error processing IceCream Order {order.id}", exc_info=ex)
            return BadResponse()
        finally:
            logger.info(f"Finish processing IceCream Order {order.id}")
```

`IceCreamOrderProcessor` has accumulated many responsibilities. These cross-concern code blocks start to bury the core functionality.

- Try-catch blocks
- Logging
- Metrics/telemetry
- Transaction Management

A lot more can go into the list, but just to keep our example concise:

- Context data Enrichment
- Caching

These **cross-cutting concerns** obscure the actual business logic and lead to code duplication across other concrete `OrderProcessor` classes. While these features are part of processing an order, they are not part of the core business logic.

## Code Like an Onion

Lets get back to the onion. when slicing through an onion, many layers the knife cuts through are not the ‘core’ part of the onion (although it’s really hard the reach the tiny core of the onion 🤪). These added features are just like those outer layers, wrapping the core without changing the essence, but adding extra functionalities.

Currently each processor class handles both core business logic and cross-cutting concerns. By applying **Decorator Pattern**, Processors are going to focus only on business logic, while decorators handle cross-cutting concerns separately.

### An Abstract Decorator

```python
class AbstractOrderProcessorDecorator(AbstractOrderProcessor, ABC):
    def __init__(self, decoratee: AbstractOrderProcessor) -> None:
        self._decoratee = decoratee
    
    @abstractmethod
    def process(self, order: Order, context: Context) -> Response:
        ...
```

The base decorator inherit from `AbstractOrderProcessor` to keep all public interface, and take a `AbstractOrderProcessor` as a parameter in constructor in order to wrap around it.

### Concrete Decorators

All those boilerplate code blocks can now be moved into multiple concrete decorators to keep code responsibilities separate:

```python
class OrderProcessor_LoggingDecorator(AbstractOrderProcessorDecorator):
    def __init__(self, decoratee: AbstractOrderProcessor) -> None:
        super().__init__(decoratee)
    
    def process(self, order: Order, context: Context) -> Response:
        logger.info(f"Start processing {order.__class__.__name__} {order.id}.")
        response = self._decoratee.process(order, context)
        logger.info(f"Finish processing {order.__class__.__name__} {order.id}.")

        return response

class OrderProcessor_ErrorHandleDecorator(AbstractOrderProcessorDecorator):
    def __init__(self, decoratee: AbstractOrderProcessor) -> None:
        super().__init__(decoratee)
    
    def process(self, order: Order, context: Context) -> Response:
        try:
            return self._decoratee.process(order, context)
        except Exception as ex:
            logger.error(
                f"Encounter error processing {order.__class__.__name__} {order.id}.", 
                exc_info=ex
            )
            
            return BadResponse()

# class OrderProcessor_TransactionDecorator(AbstractOrderProcessorDecorator):
# class OrderProcessor_TelemetryDecorator(AbstractOrderProcessorDecorator):
```

`OrderProcessor_LoggingDecorator` handles only logging. `OrderProcessor_ErrorHandleDecorator` handles only exception management, and so on. After extracting all these pieces out, the core `IceCreamOrderProcessor` can focus solely on business logic:

```python
class IceCreamOrderProcessor(AbstractOrderProcessor):
    def process(self, order: IceCreamOrder, context: Context) -> Response:
        items = self.storage.retrieve(order.items)
        ice_cream = self.fridge.prepare(items)
        ... # more logic here
```

### Using the Decorators

```python
# initialize processors
raw_processors = {
    "ice_cream": IceCreamOrderProcessor(storage, fridge),
    "bakery": BakeryOrderProcessor(storage, oven),
    # more here
}

for type in raw_processors.keys():
    raw_processors[type] = OrderProcessor_ErrorHandleDecorator(
        OrderProcessor_LoggingDecorator(
            OrderProcessor_TransactionDecorator(
                raw_processors[i]
            )
        )
    )

# calling processors
raw_processors[order.type].process(order, context)
```

Since we've separated these concerns, the order in which decorators are applied matters a lot. In this example, the `OrderProcessor_ErrorHandleDecorator` is the outermost layer to handle all possible errors, and `OrderProcessor_TransactionDecorator` is the innermost to limit the scope of transaction code.

The example above have all decorators common across all processor. But the decorator pattern really shines when we need to apply decorators conditionally.

Alright, the marketing team said they wanna promote Pizza. Let’s handle the promotion logic in another decorator, and only apply it to the `PizzaOrderProcessor`.

```python
for type in raw_processors.keys():
    Decorators = [
        OrderProcessor_TransactionDecorator,
    ]
    # apply promotion decorator conditionally.
    if type == "pizza":
        Decorators.append(OrderProcessor_PromotionDecorator)

    Decorators.append(OrderProcessor_LoggingDecorator)
    Decorators.append(OrderProcessor_ErrorHandleDecorator)
    
    for Deco in Decorators:
        raw_processors[type] = Deco(raw_processors[type])
```

```bash
# Visualizing the Decorator Pattern
OrderProcessor_ErrorHandleDecorator
└── OrderProcessor_LoggingDecorator
	└── OrderProcessor_PromotionDecorator (Pizza Only)
		└── OrderProcessor_TransactionDecorator
			└── IceCreamOrderProcessor (core)
```

This flexibility in configuration is a key benefit of the Decorator Pattern. While each `OrderProcessor` only cares about business logic at its core, it can opt into all extra behaviors it needs at runtime.

## Takeaways

### When to Use Decorator Pattern?

- When you need to add responsibilities to objects dynamically without affecting other objects.
- When extending functionality through subclassing is impractical or impossible.
- When you want to keep a clean separation of concerns by isolating supplementary behaviors from core functionality.
- When you have cross-cutting concerns that span multiple objects (like logging, transaction handling, or error management).

### Decorator Pattern Pitfalls

- **Debugging Difficulties and Proliferation Hell**: Like peeling an onion with too many layers, excessive decoration can lead to debugging difficulties—you never know which layer you're in 😅.
- **Order Dependency**: As demonstrated in our example, the order of applying decorators matters. Incorrect ordering can lead to nasty bugs.
- **Potential Interleaving**: Decorators can easily become dependent on each other, which adds tremendous complexity to the chain and defeats their modular purpose. Should be avoid at all efforts.
- **Steep Learning Curves**: Other developers may struggle to understand the complete behavior of a decorated object, especially when decorations are applied dynamically at runtime.

### Practical Takeaways

- **Single Responsibility Principle:** Each decorator should have exactly one responsibility.
- **Ordering Matters**: Apply decorators in a logical sequence to achieve the desired behavior.
- **Balance flexibility with clarity**: More layers provide more flexibility but also more complexity.

## Ending

The Decorator Pattern, much like the layers of an onion, allows us to wrap objects with additional behaviors without modifying their core functionality. This approach maintains single responsibility, enhances flexibility, and enables runtime configuration of object behavior.

You're likely already using the **Decorator Pattern** in modern application frameworks and may or may not realize it. Middleware pipelines in [Express.js](https://expressjs.com/en/guide/using-middleware.html) or [.Net Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/?view=aspnetcore-9.0) are perfect examples, each middleware decorates the request-handling pipeline with additional functionality.

By separating cross-cutting concerns from business logic, we create more maintainable, extensible code that's easier to reason about. Just be mindful of decoration depth, unlike a real onion, to avoid making your elegant solution into a tear-inducing experience 🤪🧅!