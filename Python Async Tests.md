# Python Async Tests Concurrency

## Why run tests asynchronously?

When we discuss this in the context of unit tests, the answer is fairly straightforward. Unit tests come with its tests isolation principle, which means each unit test should be executed in its own controlled environment, dependencies should not be shared across different tests. Thus, the default behavior of most unit test framework are executing tests in certain order sequentially.

But things become a bit different when it comes to integration tests, especially system tests. Different from unit tests, system tests are usually testing againt an actually running system, to verify the system or a certain part of it is working as expected, while unit tests are more focused on the behavior of a certain code block inside test environment is matching our expectation. As of 2025, Most of software systems is handling concurrency in some way, systems are allowing multiple things happening in the same time, 'sharing' becomes the nature. Therefore, forcing system tests to be executed one at time is not necessary anymore. Thats probably why library like Cucumber and playwright, they support concurrency out of box.


## dependency management
Dependency management is big topic in testing.

## concurrency management
The nature of concurrency in modern software systems allow different things to happen in the system at the same time, but does not mean that things will always have same side effect as if we are in a single tenancy environment.

## When it comes to pytest

### pytest-asyncio
[pytest-asyncio](https://github.com/pytest-dev/pytest-asyncio) is bridging the gap of async and pytest, making async function test-able.

One of my previous confusion is why a parametrized async test still run sequentially?

### pytest-xdist
[pytest-xdist](https://github.com/pytest-dev/pytest-xdist) is a more general way of bringing concurrency into pytest framework.

Having some problem in grouping test cases up, but kinda hard to manage tests resources.

### pytest-asyncio-concurrent
[pytest-asyncio-concurrent](https://github.com/czl9707/pytest-asyncio-concurrent) is a library I built to bridging the gap. Which might not be a perfect solution.

