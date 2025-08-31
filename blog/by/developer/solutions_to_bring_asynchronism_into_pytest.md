---
title: "Conquering Slow Tests: 4 Solutions to Bring Concurrency into Pytest"
description: System and integration tests sometimes require substantial execution time. The blog shares my journey of exploring multiple approaches to address the efficiency challenges, culminating in developing a custom pytest plugin.
cover-url: https://zane-portfolio.s3.us-east-1.amazonaws.com/PytestConcurrencyCover.png
tags: [asyncio, python, testing]
featured: true
created-date: 2025-02-27T00:00:00-04:00
last-modified-date: 2025-08-27T00:00:00-04:00
---

**TL;DR:** To conquer the concurrency problem in pytest, multiple solutions has been explored. Starting with `pytest-xdist`, then a combination of `pytest-asyncio` with `pytest-subtests`, and finally built my own plugin, `pytest-asyncio-concurrent`, to overcome limitations.

## Problem Statement: Slow Sequential Tests

```python
def test_my_system():
    send_event_to_my_system()

    for i in range(10):
        if verify_my_system_behavior():
            return
        else:
    time.sleep(1)
    raise Exception("my system did not behave as expected")
```

```bash
========================= test session starts =========================
platform linux -- Python 3.12.5, pytest-8.3.4, pluggy-1.5.0
collected 1 item

tests/my_test.py::test_my_system PASSED [100%]

========================== 1 passed in 5.01s ==========================
```

This simple test case exemplifies the essence of many system tests. Send an event, verify the result periodically, and have a timeout. The example test case takes at most 10 seconds to finish, but in the real world, this can be considerably longer.

Life is good so far, until more test cases need to be covered.

```python
@pytest.mark.parametrize("param", [...])
def test_my_system(param):
    send_event_to_my_system(param)

    for i in range(10):
        if verify_my_system_behavior(param):
            return
        else:
    time.sleep(1)
    raise Exception("my system did not behave as expected")
```

```bash
========================= test session starts =========================
platform linux -- Python 3.12.5, pytest-8.3.4, pluggy-1.5.0
collected 5 item

tests/my_test.py::test_my_system[1] PASSED  [20%]
tests/my_test.py::test_my_system[2] PASSED  [40%]
tests/my_test.py::test_my_system[3] PASSED  [60%]
tests/my_test.py::test_my_system[4] PASSED  [80%]
tests/my_test.py::test_my_system[5] PASSED [100%]

========================== 5 passed in 25.03s ==========================
```

The tests still passing. However, it started to become a pain as it is time-consuming to develop, debug, and run them. The tests now take minutes to complete. As more and more tests were added, the situation worsened.

## Solution 1: Pytest-xdist

[pytest-xdist](https://github.com/pytest-dev/pytest-xdist) provides a general method of bringing concurrency into pytest framework by executing tests on multiple processes.

```bash
$ python -m pytest -n auto

========================= test session starts =========================
platform linux -- Python 3.12.5, pytest-8.3.4, pluggy-1.5.0
16 workers [5 items]
scheduling tests via LoadScheduling

[gw3] [ 20%] PASSED tests/test.py::test_my_system[4]
[gw2] [ 40%] PASSED tests/test.py::test_my_system[3]
[gw0] [ 60%] PASSED tests/test.py::test_my_system[1]
[gw4] [ 80%] PASSED tests/test.py::test_my_system[5]
[gw1] [100%] PASSED tests/test.py::test_my_system[2]

========================== 5 passed in 5.87s ==========================
```

The `-n` CLI parameter specifies the number of processes to use for test execution. With `-n auto`, `pytest-xdist` will create a number of processes equal to the number of physical CPU cores.

This solution works effectively. As the test cases kept growing, the total number of tests exceeded the number of CPU cores pretty soon. In order to achieve the shortest test execution time (Yes, I am greedy.), I switched to `-n ##`, and kept increasing the number.

The number after `-n` kept increasing until our fragile dev server crashed due to too many worker processes. However, most of the time, those workers are simply `sleep`-ing, and occupying resources. Why should we spawn dozens of workers in such a scenario?

## Solution 2: Pytest-asyncio

Let's use `async` to allow resource sharing across different test cases within single process. Although `async` has been around in Python since 3.4, `pytest` does not natively support asynchronous test cases.

[pytest-asyncio](https://github.com/pytest-dev/pytest-asyncio) bridges the gap of `async` and `pytest`, making async function test-able.

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

```bash
========================= test session starts =========================
platform linux -- Python 3.12.5, pytest-8.3.4, pluggy-1.5.0
plugins: asyncio-0.25.3
asyncio: mode=Mode.STRICT, asyncio_default_fixture_loop_scope=None
collected 5 item

tests/my_test.py::test_my_system[1] PASSED  [20%]
tests/my_test.py::test_my_system[2] PASSED  [40%]
tests/my_test.py::test_my_system[3] PASSED  [60%]
tests/my_test.py::test_my_system[4] PASSED  [80%]
tests/my_test.py::test_my_system[5] PASSED [100%]

========================== 5 passed in 25.04s ==========================
```

Without thoroughly reviewing the documentation of `pytest-asyncio`, the tests took minutes again, async tests ran as if they were synchronous tests. We found ourselves back to the beginning.

It turns out `pytest-asyncio` wraps all async test functions as synchronous functions, making them consumable for pytest as regular functions.

Although `pytest-asyncio` does not allow tests to be run concurrently, it do introduce concurrency inside the scope of single test.

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
        except Exception as e:
        logger.error(f"test case test_my_system_single{param} fail", exc_info=e)

    tasks = [test_my_system_single(param) for param in [...]]
    await asyncio.gather(*tasks)
```

We can incorporate different test cases into one test and execute them in a single loop. However, the downside is obvious and huge, all the error handling and dependency management become our responsibility, and these test cases disappear from test report. We pretty much lose the benefit of using a testing framework.

## Solution 3: Pytest-asyncio + Pytest-subtests

Basically, we were creating a bunch of subtests within one test case and organize them by ourselves. And fortunately, [pytest-subtests](https://github.com/pytest-dev/pytest-subtests) can help us manage them in a more structured manner.

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

```bash
========================= test session starts =========================
platform linux -- Python 3.12.5, pytest-8.3.4, pluggy-1.5.0
plugins: asyncio-0.25.3, subtests-0.14.1
asyncio: mode=Mode.STRICT, asyncio_default_fixture_loop_scope=None
collected 1 item

tests/test.py::test_my_system [test_my_system[1]] SUBPASS       [100%]
tests/test.py::test_my_system [test_my_system[2]] SUBPASS       [100%]
tests/test.py::test_my_system [test_my_system[3]] SUBPASS       [100%]
tests/test.py::test_my_system [test_my_system[4]] SUBPASS       [100%]
tests/test.py::test_my_system [test_my_system[5]] SUBPASS       [100%]
tests/test.py::test_my_system PASSED [100%]

================= 1 passed, 5 subtests passed in 5.01s ================

```

This approach is becoming solid. Tests run concurrently within the same process, and we retain most of the benefits from the framework, while the cost is some boilerplate required for each parent test.

## Solution 4: Pytest-asyncio-concurrent

The solution described above functions effectively, but is still suboptimal. Subtests are not first-class citizens in pytest, and the boilerplate is required in every parent test function. To minimize the boilerplate and eliminate the appearance of `subtests`, I built a plugin to bridge the gap.

[pytest-asyncio-concurrent](https://github.com/czl9707/pytest-asyncio-concurrent) is designed to enable async tests to run concurrently while providing granular concurrency control.

```python
@pytest.mark.asyncio_concurrent(group="my_system")
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

```bash
========================= test session starts =========================
platform linux -- Python 3.12.5, pytest-8.3.4, pluggy-1.5.0
plugins: asyncio-concurrent-0.3.0
collected 5 item

tests/my_test.py::test_my_system[1] PASSED  [20%]
tests/my_test.py::test_my_system[2] PASSED  [40%]
tests/my_test.py::test_my_system[3] PASSED  [60%]
tests/my_test.py::test_my_system[4] PASSED  [80%]
tests/my_test.py::test_my_system[5] PASSED [100%]

========================== 5 passed in 5.04s ==========================

```

Using [pytest-asyncio-concurrent](https://github.com/czl9707/pytest-asyncio-concurrent) is fairly straightforward, by marking tests with `pytest.mark.asyncio_concurrent` and assigning the same group name, those tests will run together. Conversely, tests marked with different group names will just go sequentially.

```python
@pytest.mark.asyncio_concurrent()
async def test_my_system_seperate():
    await asyncio.sleep(2)
    assert verify()

@pytest.mark.asyncio_concurrent(group="my_group")
async def test_my_system_grouped_1():
    await asyncio.sleep(1)
    assert verify()

@pytest.mark.asyncio_concurrent(group="my_group")
async def test_my_system_grouped_2():
    await asyncio.sleep(1)
    assert verify()

```

```bash
========================= test session starts =========================
platform linux -- Python 3.12.5, pytest-8.3.4, pluggy-1.5.0
plugins: asyncio-concurrent-0.3.0
collected 3 item

tests/my_test.py::test_my_system_seperate PASSED   [33%]
tests/my_test.py::test_my_system_grouped_2 PASSED  [67%]
tests/my_test.py::test_my_system_grouped_1 PASSED [100%]

========================== 3 passed in 3.03s ==========================

```

### Test Group

As mentioned above the plugin evolved from the solution `pytest-asyncio` + `pytest-subtests`, but the boilerplate has been incorporated into the framework. Thus async tests are collected and grouped during the test collection phase, and executed group by group in the execution phase.

I don't want to dive too deep into the design and implementation of pytest. So, long story short, Pytest maintains a `SetupState` to keep track of a stack of active nodes, beginning with `Session`, and ending with a `Function`, each node should be child of the previous node, in other words, we can not push multiple `Function`s onto the stack directly.

Therefore, one more layer of node, `Group`, has been created. Instead of pushing `Function`s onto the stack, the `Group` resides on the stack and manages async test functions, just like our approach in the `pytest-subtests` solution.

### Timeout

It's not easy to fully understand the latest state of the system during system tests execution. As a result, falling into infinite loops is not uncommon. A Timeout feature has been introduced for convenience.

```python
@pytest.mark.asyncio_concurrent(group="my_group", timeout=10)
async def test_infinite_loop():
    while True:
        await asyncio.sleep(2)

@pytest.mark.asyncio_concurrent(group="my_group", timeout=10)
async def test_system():
    await asyncio.sleep(1)
    assert verify()

```

```bash
========================= test session starts =========================
platform linux -- Python 3.12.5, pytest-8.3.4, pluggy-1.5.0
plugins: asyncio-concurrent-0.3.0
collected 2 item

tests/my_test.py::test_infinite_loop FAILED [50%]
tests/my_test.py::test_system PASSED [100%]

============================== FAILURES ===============================
_________________________ test_infinite_loop __________________________

    @pytest.mark.asyncio_concurrent(group="my_group", timeout=10)
    async def test_infinite_loop():
        while True:
> await asyncio.sleep(2)

...

==================== 1 failed, 1 passed in 10.04s =====================

```

### Fixtures Lifecycle

*Note: This section addresses implementation details. Feel free to skip if you are not interested.*

Going back to the solution `pytest-asyncio` + `pytest-subtests`, all tests executed as `subtests` are more or less sharing the same set of fixtures. This means we have to either manage the fixture lifecycle inside the test function or just literally let them share the same fixtures.

Moving to the plugin `pytest-asyncio-concurrent`, We are facing the same problem.  Pytest registers each `FixtureDef` as a singleton across the session. The `FixtureDef` instance contains the metadata of the fixture,  and is also in charge of storing its value once it is entered and clearing once exited.

The solution, while a bit hacky, is straightforward. We clone the `FixtureDef` instance before a function fixture is requested, and we maintain a cache of `FixtureDef` instances using `Function` as key.

## Ending

When working with system tests, the testing strategy should reflect the model of the system under testing, particularly regarding concurrency.

- Run tests sequentially if:
	- Tests may cause racing condition on your system.
- Try `pytest-xdist` first if:
	- Tests are CPU-bound.
	- Tests are not `async`.
- Use `pytest-asyncio` + `pytest-subtests` if :
	- Tests are IO-bound.
	- Tests are `async`.
	- CI server have very limited resources especially.

I built [pytest-asyncio-concurrent](https://github.com/czl9707/pytest-asyncio-concurrent) to bridge the gap after experimenting with different approaches. Welcome to try out [pytest-asyncio-concurrent](https://github.com/czl9707/pytest-asyncio-concurrent), and welcome any feedback!