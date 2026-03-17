---
title: "4. Beyond the CLI"
description: "Understand OpenClaw by Building One - Part 4"
cover: media/build-your-own-openclaw/07-event-driven.svg
tags: [agent, ai]
featured: false
created-date: 2026-03-15T23:08:44-04:00
last-updated-date: 2026-03-16T22:41:40-04:00
---

- [1. Every Agent Starts as a Loop](blog/by/developer/build_your_own_openclaw_1.md)
- [2. Gear up Your Agent](blog/by/developer/build_your_own_openclaw_2.md)
- [3. Pack the Conversation And Carry On](blog/by/developer/build_your_own_openclaw_3.md)
- [4. Beyond the CLI](blog/by/developer/build_your_own_openclaw_4.md)
- [5. Many of Them](blog/by/developer/build_your_own_openclaw_5.md)
- [6. Agents are Running, Your are Sleeping](blog/by/developer/build_your_own_openclaw_6.md)
- [7. More Context! More Context!](blog/by/developer/build_your_own_openclaw_7.md)

All code snippets and working code bases are available at [this repo](https://github.com/czl9707/build-your-own-openclaw).

## Beyond the CLI

Your agent works great in the terminal. But what if you want to talk to it from Telegram? Or your phone? Or another program? Or even multiple of them.

## Event-Driven Architecture

To make the agent more scalable, we introduce event-driven architecture before adding more feature.

The pattern is pub/sub, and you already know it. An event bus sits at the center. Messages come in as events, workers process them, responses go out as events.

```python
@dataclass
class InboundEvent:
    session_id: str
    content: str
    source: EventSource

@dataclass
class OutboundEvent:
    session_id: str
    content: str
    error: str | None = None

class EventBus(Worker):
    def subscribe(self, event_class, handler):
        """Subscribe a handler to an event class."""

    async def publish(self, event: Event) -> None:
        """Publish an event to the internal queue."""
        await self._queue.put(event)

    async def run(self) -> None:
        while True:
            event = await self._queue.get()
            await self._dispatch(event)
```

![Event-driven system](media/build-your-own-openclaw/07-event-driven.svg)

### Channels & Agent Worker & Delivery Worker

Three workers form a pipeline:

1. **Channel Worker** — Receives messages from platforms (CLI, Telegram, WebSocket), publishes `InboundEvent`s
2. **Agent Worker** — Subscribes to `InboundEvent`s, runs the agent session, publishes `OutboundEvent`s
3. **Delivery Worker** — Subscribes to `OutboundEvent`s, routes responses back to the right channel

A channel is an abstraction over a messaging platform. CLI, Telegram, Discord, WebSocket. The channel publishes an `InboundEvent` to the event bus.

![Channels](media/build-your-own-openclaw/09-channels.svg)

```python
class Channel(ABC):
    @abstractmethod
    async def run(self, on_message: Callable) -> None:
        """Run the channel. Blocks until stop() is called."""
        on_message(message) # Inbound Event to event_bus

    @abstractmethod
    async def reply(self, content: str, source) -> None:
        """Reply to incoming message."""
```

The agent worker bridges events and sessions:

```python
class AgentWorker:
    def __init__(self, context):
        self.context.eventbus.subscribe(InboundEvent, self.dispatch_event)

    async def dispatch_event(self, event: InboundEvent):
        agent = Agent(agent_def, self.context)
        session = agent.resume_session(event.session_id)
        response = await session.chat(event.content)

        # Publish result
        result = OutboundEvent(
            session_id=event.session_id,
            content=response,
        )
        await self.context.eventbus.publish(result)
```

The delivery worker picks up `OutboundEvent`s and sends them back through the appropriate channel:

```python
class DeliveryWorker:
    def __init__(self, context):
        self.context.eventbus.subscribe(OutboundEvent, self.deliver)

    async def deliver(self, event: OutboundEvent):
        # Look up which channel this session belongs to
        channel = self._get_channel_for_session(event.session_id)
        await channel.reply(event.content, event.source)

        # Confirm delivery - removes persisted event file
        self.context.eventbus.ack(event)
```

### Event Persistence: Don't Lose Messages

What happens if the server crashes after the agent responds but before delivery? The message is lost.

The fix: persist `OutboundEvent`s to disk before dispatching, delete only after successful delivery:

```python
class EventBus(Worker):
    async def run(self) -> None:
        await self._recover()  # Re-dispatch pending events on startup
        while True:
            event = await self._queue.get()
            await self._dispatch(event)

    async def _dispatch(self, event: Event) -> None:
        await self._persist_outbound(event)  # Write to disk first
        await self._notify_subscribers(event)

    def ack(self, event: Event) -> None:
        """Called by DeliveryWorker after successful delivery."""
        filename = f"{event.timestamp}_{event.session_id}.json"
        (self.pending_dir / filename).unlink()  # Delete persisted file
```

The flow is complete:

```
user message → channel → InboundEvent → AgentWorker → OutboundEvent → persist → DeliveryWorker → channel → user → ack → delete.
```

## WebSocket

Sometimes you want code to talk to your agent, not a human. WebSocket provides a programmatic interface.

The `WebSocketWorker` has two roles:

- **Channel** — Receives messages from WebSocket clients, publishes `InboundEvent`s
- **Broadcaster** — Subscribes to all events, broadcasts them to every connected client

```python
class WebSocketWorker:
    def __init__(self, context):
        self.clients: Set[WebSocket] = set()
        # Broadcaster role: subscribe to ALL events
        for event_class in [InboundEvent, OutboundEvent]:
            self.context.eventbus.subscribe(event_class, self.handle_event)

    # Channel role: receive from clients
    async def handle_connection(self, ws: WebSocket) -> None:
        self.clients.add(ws)
        try:
            await self._run_client_loop(ws)  # Publishes InboundEvent
        finally:
            self.clients.discard(ws)

    # Broadcaster role: send to all clients
    async def handle_event(self, event: Event) -> None:
        for client in list(self.clients):
            try:
                await client.send_json(event_dict)
            except Exception:
                self.clients.discard(client)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await context.websocket_worker.handle_connection(websocket)
```

![WebSocket](media/build-your-own-openclaw/10-websocket.svg)

## Next Steps

[Previous: Pack the Conversation And Carry On](blog/by/developer/build_your_own_openclaw_3.md) | [Next: Many of Them](blog/by/developer/build_your_own_openclaw_5.md)

**[⭐ Star the repo](https://github.com/czl9707/build-your-own-openclaw)** if you found this series helpful!
