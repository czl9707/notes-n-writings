---
title: "6. Agents are Running, Your are Sleeping"
description: "Understand OpenClaw by Building One - Part 6"
cover: media/build-your-own-openclaw/12-cron-heartbeat.svg
tags: [agent, ai]
featured: false
created-date: 2026-03-15T23:08:44-04:00
last-updated-date: 2026-03-16T21:12:57-04:00
---

- [1. Every Agent Starts as a Loop](blog/by/developer/build_your_own_openclaw_1.md)
- [2. Gear up Your Agent](blog/by/developer/build_your_own_openclaw_2.md)
- [3. Pack the Conversation And Carry On](blog/by/developer/build_your_own_openclaw_3.md)
- [4. Beyond the CLI](blog/by/developer/build_your_own_openclaw_4.md)
- [5. Many of Them](blog/by/developer/build_your_own_openclaw_5.md)
- [6. Agents are Running, Your are Sleeping](blog/by/developer/build_your_own_openclaw_6.md)
- [7. More Context! More Context!](blog/by/developer/build_your_own_openclaw_7.md)

All code snippets and working code bases are available at [this repo](https://github.com/czl9707/build-your-own-openclaw).

## Cron & Heartbeat

Your agent works when you talk to it. But what if it could work while you sleep?

Nothing different from a cron job in engineer world, cron expressions define when a job runs. A background worker checks every minute, finds due jobs, and dispatches them.

Jobs are defined in `CRON.md` files with a schedule and prompt. The agent runs at the appointed time, does the work, and optionally posts a message back.

```python
class CronDef(BaseModel):
    id: str
    name: str
    description: str
    agent: str
    schedule: str  # Cron expression
    prompt: str
    one_off: bool = False

class CronWorker(Worker):
    async def run(self) -> None:
        while True:
            await self._tick()
            await asyncio.sleep(60)

    async def _tick(self) -> None:
        jobs = self.context.cron_loader.discover_crons()
        due_jobs = find_due_jobs(jobs)

        for cron_def in due_jobs:
            event = DispatchEvent(
                session_id=session.session_id,
                source=CronEventSource(cron_id=cron_def.id),
                content=cron_def.prompt,
            )
            await self.context.eventbus.publish(event)
```

![Cron and scheduling](media/build-your-own-openclaw/12-cron-heartbeat.svg)

## Cron-Ops Skills

The Cron Operation functionality is implemented using the **SKILL system** rather than registering dedicated tools which avoids bloating the tool registry.

Reference [example repo](https://github.com/czl9707/build-your-own-openclaw) for example skills.

## Concurrency Control: Don't Overload

When multiple requests come in - from cron jobs, from users, from other agents - you need limits. Some agents are expensive to run. Some APIs have rate limits. Unbounded concurrency leads to failures.

Lets use a semaphore based solution to limit concurrency. And each agent has a `max_concurrency` setting. The semaphore ensures no more than that many instances run at once. Requests wait in line instead of crashing the system.

```python
class AgentWorker(SubscriberWorker):
    def __init__(self, context):
        self._semaphores: dict[str, asyncio.Semaphore] = {}

    async def exec_session(self, event, agent_def) -> None:
        sem = self._get_or_create_semaphore(agent_def)
        async with sem:  # Blocks if limit reached
            # ... execute session ...
```

## Post Message Back: Agents Can Initiate

Sometimes an agent needs to reach out proactively. Maybe it finished a long-running task. Maybe it detected something important. The `post_message` tool lets agents initiate conversations.

```python
@tool(...)
async def post_message(content: str, session) -> str:
    event = OutboundEvent(
        session_id=session.session_id,
        source=AgentEventSource(agent_id=session.agent.agent_def.id),
        content=content,
    )
    await context.eventbus.publish(event)
    return "Message queued for delivery"
```

![Post message back](media/build-your-own-openclaw/14-post-message-back.svg)

This is how agents say "I'm done" or "Something happened" without being prompted.

The `post_message` tool is only available in Cron jobs — agents can't arbitrarily post messages outside scheduled tasks.

### HEARTBEAT Vs CRON

OpenClaw has two distinct scheduling mechanisms:

- **HEARTBEAT:** Only one allowed, runs in the main session at a regular interval without checking time. Simple periodic execution.
- **CRON:** Multiple allowed, runs in background respecting cron expressions. Full scheduling flexibility.

## Next Steps

[Previous: Many of Them](blog/by/developer/build_your_own_openclaw_5.md) | [Next: More Context! More Context!](blog/by/developer/build_your_own_openclaw_7.md)

**[⭐ Star the repo](https://github.com/czl9707/build-your-own-openclaw)** if you found this series helpful!

