# Python Async Tests Concurrency

## Why run tests asynchronously?

When we discuss this in the context of unit tests, the answer is fairly straightforward. Unit tests come with its tests isolation principle, which means each unit test should be executed in its own controlled environment, dependencies should not be shared across different tests. Thus, the default behavior of most unit test framework are executing tests in certain order sequentially.

But things become a bit different when it comes to integration tests, especially system tests. Different from unit tests, system tests are usually testing againt an actually running system, to verify the system or a certain part of it is working as expected, while unit tests are more focused on the behavior of a certain code block inside test environment is matching our expectation. As of 2025, Most of software systems is handling concurrency in some way, systems are allowing multiple things happening in the same time, 'sharing' becomes the nature. Therefore, forcing system tests to be executed one at time is not necessary anymore. Thats probably why library like Cucumber and playwright, they support concurrency out of box.


## Concerns when Running Tests Concurrently
Just like making a single-thread service supporting multi-thread in most cases won't be simply having multiple threads runing the old stuff, Same thing applies to testing.

### dependency management

Dependency management is big topic in testing in general. It's one of the key functionality testing frameworks providing. All frameworks have some way of executing some code before and after single test or group of tests. For example, [NUnit](https://nunit.org/) provide `[SetUp]`, `[TearDown]`, `[OneTimeSetUp]`, `[OneTimeTearDown]`, while similarly [Jest](https://jestjs.io/) provided `beforeEach`, `afterEach`, `beforeAll`, `afterAll`. In python these thing can be achieved using fixture systems. 

Running tests concurrently brings a lot ambiguity towards this area. Tests run concurrently request for the same fixture, should the fixture be shared or not?

**Probably need more research on this topic**


### concurrency management

The nature of concurrency in modern software systems allow different things to happen in the system at the same time, but does not mean that things will always have same side effect as if we are in a single tenancy environment. A very common case will be the 'preventing duplicate events'. If multiple events matching certain criteria come within a certain time period, the service will take the first one and put some locking mechanism, and drop all the followings until the lock got released. 

Imagine the we have multiple test cases test different flavors of same event, with a bad concurrency management, all tests got kicked off in same period, without waiting for the first test case release its lock, all other tests will fail for sure, but due to lack of consideration.

So we need a way to prevent some test cases being executed together, or explicitly specifying some test cases can run together.


## When it comes to pytest

```python
def test_my_system():
    send_event_to_my_system()
    
    for i in range(10):
        if verify_my_system_behavior():
            return
        else:
            sleep(1)
    raise Exception("my system did not behave as expected")
```
A very short test case, but should  get spirit a lot of system tests. Send an event, and verify once every few seconds, and have a timeout. 

Life is good so far. Let's parametrize this a bit to cover more use case.

```python
@pytest.mark.parametrize("param", [...])
def test_my_system(param):
    send_event_to_my_system(param)

    for i in range(10):
        if verify_my_system_behavior(param):
            return
        else:
            sleep(1)
    raise Exception("my system did not behave as expected")
```

My tests still passing. But it started to become a pain to develop, debug and run these tests. The tests take minutes to finish everytime.

## Any Solutions?

### pytest-asyncio
[pytest-asyncio](https://github.com/pytest-dev/pytest-asyncio) is bridging the gap of async and pytest, making async function test-able. The tests

One of my previous confusion is why a parametrized async test still run sequentially?

### pytest-asyncio + pytest-subtests


### pytest-xdist
[pytest-xdist](https://github.com/pytest-dev/pytest-xdist) is a more general way of bringing concurrency into pytest framework.

Having some problem in grouping test cases up, but kinda hard to manage tests resources.

### pytest-asyncio-concurrent
[pytest-asyncio-concurrent](https://github.com/czl9707/pytest-asyncio-concurrent) is a library I built to bridging the gap. Which might not be a perfect solution.

