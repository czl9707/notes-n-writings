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
``` shell
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
``` shell
```

My tests still passing. But it started to become a pain to develop, debug and run these tests. The tests take minutes to finish everytime. As more and more tests got added, thing become worth.

### pytest-xdist
[pytest-xdist](https://github.com/pytest-dev/pytest-xdist) is a general way of bringing concurrency into pytest framework, by executing tests on multiple CPUs.

``` shell
python -m pytest -n auto

```

The `-n` cli parameter specify the number of processes to execute tests. With `-n auto`, pytest-xdist will spin same number of processes as physical CPU cores.

This solution works great. As the test cases keep growing, the total number of tests become much larger than number of CPU cores. In order to maintain a short test execution time, instead of giving parameter `-n auto`, I changed to `-n ##` and kept increasing the number. 

Thing going well until our fragile dev server crashed due to too many workers got spinned up. Come on! it's just some simple system tests, why spinning up dozons of processes?

If we look at our simple test case, it spends most of the time in `sleep(1)`, which hung the whole processes and do nothing, and we have dozens of them!


### async & await
Lets use `async` then. So that we can have all stuff share the same process.

```python
@pytest.mark.parametrize("param", [...])
async def test_my_system(param):
    send_event_to_my_system(param)

    for i in range(10):
        if verify_my_system_behavior(param):
            return
        else:
            await asyncio.sleep(1)
    raise Exception("my system did not behave as expected")
```
``` shell
```

Although `async` has been around in python since 3.4, `pytest` do not support async test case out of box.

### pytest-asyncio
[pytest-asyncio](https://github.com/pytest-dev/pytest-asyncio) is bridging the gap of async and pytest, making async function test-able.

```python
@pytest.mark.asyncio
@pytest.mark.parametrize("param", [...])
async def test_my_system(param):
    send_event_to_my_system(param)

    for i in range(10):
        if verify_my_system_behavior(param):
            return
        else:
            await asyncio.sleep(1)
    raise Exception("my system did not behave as expected")
```
``` shell
```

Without reading documentation of `pytest-asyncio` carefully, the tests took minutes again, my async tests still run as they are synchronous tests. We got sent back to the beginning. 

It turns out `pytest-asyncio` wraps all async test function as synchronous, and send them to pytest as if they are normal function.

Although `pytest-asyncio` do not allow tests to be run concurrently, it do open some opportunity to bring concurrency inside the scope of single test.


```python
@pytest.mark.asyncio
async def test_my_system():
    async def test_my_system_single(param):
        try:
            send_event_to_my_system(param)
        
            for i in range(10):
                if verify_my_system_behavior(param):
                    return
                else:
                    await asyncio.sleep(1)
            raise Exception("my system did not behave as expected")
        except:
            logger.error(f"test case test_my_system_single{param} fail")

    tasks = [test_my_system_single(param) for param in [...]]
    await asyncio.gather(*tasks)
```
**verify this please**


We are able to put different test cases into one test and executed them in a single loop. But the downside is obvious and huge, all the error handling, dependency management are on us, and we lose the ability to view different test cases in report. We pretty much lose the benefit of using a test framword :(.

### pytest-asyncio + pytest-subtests

What we did is basically creating a bunch of subtests with in one test case, and luckily we have [pytest-subtests](https://github.com/pytest-dev/pytest-subtests) to help us manage them in a more structured way.

```python
@pytest.mark.asyncio
async def test_my_system(subtests):
    async def test_my_system_single(param):
        with subtests.test(msg=f'test_my_system[{param}]'):
            send_event_to_my_system(param)
        
            for i in range(10):
                if verify_my_system_behavior(param):
                    return
                else:
                    await asyncio.sleep(1)

    tasks = [test_my_system_single(param) for param in [...]]
    await asyncio.gather(*tasks)
```
``` shell
```

This is becoming solid. Tests are running concurrently utilizing same process, and we are not losing too much of the benefits from framework. But there is still some boil template required for each parent test.

### pytest-asyncio-concurrent
[pytest-asyncio-concurrent](https://github.com/czl9707/pytest-asyncio-concurrent) is a library I built to bridging the gap, which evolved from the solution mentioned above.



Which might not be a perfect solution.

