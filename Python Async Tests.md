# Python Async Tests

### Why run tests asynchronously?
When we discuss this in the context of unit tests, the answer is fairly straightforward. Unit tests come with its tests isolation principle, which means each unit test should be executed in its own controlled environment, dependencies should not be shared across different tests. Thus, the default behavior of most unit test framework are executing tests in certain order sequantially.

But things become a bit different when it comes to integration tests, especially system tests. Different from unit tests, the purpose of system tests are verifying the actual running system or a certain part of it is working as expected, while unit tests are more targeted on the behavior of a certain code block is matching our expectation. Most of software systems is handling concurrency in some way, multiple things will happen at the same time, sharing the system is the nature. Therefore, forcing system tests to be executed one at time is not necessary anymore.

### Some Confusion I have went through.
#### I have paratermized tests and 

