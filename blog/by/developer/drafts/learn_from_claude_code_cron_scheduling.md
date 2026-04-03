---
title: "Learn From Claude Code: Cron & Scheduling"
description: How Claude Code implements scheduled prompts — cross-process locks, deterministic jitter, DST-aware calculation, and the operational levers that prevent thundering herds.
cover: media/covers/learn-from-claude-code-cover.svg
tags:
  - agent
  - ai
featured: true
created-date: 2026-04-03T00:00:00-04:00
last-updated-date: 2026-04-03T00:00:00-04:00
---

Claude Code's source code leaked. Setting aside the surveillance concerns and inevitable spaghetti of any real codebase, it's a genuinely well-designed harness.

I've been digging through it, picking out patterns worth understanding. This is one of them: cron scheduling — how Claude Code lets users schedule prompts to run later, and the guardrails that prevent "remind me at 3pm" from taking down the API at :00.

## The Problem

Users want to schedule prompts:
- "Check my PRs every hour"
- "Remind me at 2:30pm today"
- "Run tests every morning at 9am"

This is cron. But a distributed cron where:
- Multiple Claude sessions might share the same project
- Everyone picks the same "round" times (:00, :30)
- The API shouldn't get hammered by thousands of simultaneous requests

The system needs to:
1. Parse cron expressions correctly (including DST edge cases)
2. Coordinate across processes (only one scheduler per project)
3. Spread load via jitter (avoid thundering herd)
4. Handle missed tasks (Claude wasn't running at the scheduled time)
5. Expire old tasks (prevent unbounded growth)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Scheduler Core                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  chokidar ──▶ load() ──▶ tasks[] ──▶ check() (1s) ──▶ fire │
│      ▲                           ▲                        │
│      │                           │                        │
│      └───────────────────────────┘                        │
│                                                          │
│  ┌────────────────┐      ┌─────────────────────────┐    │
│  │ Scheduler Lock │◀────▶│ Cross-Process           │    │
│  │ (.claude/       │      │ Coordination            │    │
│  │  scheduled_    │      │ (tryAcquire/release)    │    │
│  │  tasks.lock)   │      └─────────────────────────┘    │
│  └────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
```

Five files:
- `cron.ts` — Expression parsing, next-run calculation
- `cronTasks.ts` — Task persistence (CRUD, file format)
- `cronScheduler.ts` — Core loop (file watch, timer, fire)
- `cronTasksLock.ts` — Cross-process lock
- `cronJitterConfig.ts` — GrowthBook-backed config

## Cron Expression Parsing

Standard 5-field cron in **local timezone**:

```
minute hour day-of-month month day-of-week
0-59   0-23  1-31        1-12   0-6 (0=Sunday)
```

No UTC. User-facing crons use the process's local timezone.

### Field Expansion

```typescript
function expandField(field: string, range: FieldRange): number[] | null {
  for (const part of field.split(',')) {
    // */N or N-M/N → step syntax
    // N-M → range
    // N → single value
  }
}
```

Tolerant parsing:
- `*/5` — every 5 minutes
- `1-31/2` — every other day
- `1,15,30` — comma-separated list
- `7` as Sunday alias for dayOfWeek

### Next-Run Calculation

```typescript
function computeNextCronRun(fields: CronFields, from: Date): Date | null {
  // Round up to next whole minute (strictly after `from`)
  const t = new Date(from.getTime())
  t.setSeconds(0, 0)
  t.setMinutes(t.getMinutes() + 1)

  for (let i = 0; i < maxIter; i++) {  // maxIter = 366 days
    if (minuteSet.has(t.getMinutes()) &&
        hourSet.has(t.getHours()) &&
        monthSet.has(t.getMonth() + 1) &&
        dayMatches(domSet, dowSet, t)) {
      return t
    }
    // Walk forward minute-by-minute
  }
}
```

### DST Handling

The code handles spring-forward gaps by minute-by-minute walking:

> Fixed-hour crons targeting a spring-forward gap (e.g. `30 2 * * *` in a US timezone) skip the transition day — the gap hour never appears in local time, so the hour-set check fails and the loop moves on.

If you schedule `30 2 * * *` and DST springs forward at 2am, the gap hour "never appears" in local time. The check for `hourSet.has(2)` never matches, so the loop continues to 3am. Natural handling of an edge case.

### Day Matching

When both dayOfMonth and dayOfWeek are constrained:

```typescript
const dayMatches =
  domWild && dowWild
    ? true
    : domWild
      ? dowSet.has(dow)
      : dowWild
        ? domSet.has(dom)
        : domSet.has(dom) || dowSet.has(dow)  // OR semantics
```

Standard cron OR semantics: if either day field matches, the task fires.

## Cross-Process Lock

Multiple Claude sessions in the same project directory? Only one drives the scheduler:

```typescript
type SchedulerLock = {
  sessionId: string
  pid: number
  acquiredAt: number
}
```

Location: `.claude/scheduled_tasks.lock`

### Acquisition Logic

```typescript
async tryAcquireSchedulerLock(opts?): Promise<boolean> {
  // 1. Try O_EXCL atomic create
  if (await tryCreateExclusive(lock, dir)) return true

  const existing = await readLock(dir)

  // 2. Already ours (idempotent)
  if (existing?.sessionId === sessionId) return true

  // 3. Another live session → blocked
  if (existing && isProcessRunning(existing.pid)) return false

  // 4. Stale (PID dead) → unlink and retry once
  await unlink(getLockPath(dir))
  return await tryCreateExclusive(lock, dir)
}
```

Two sessions racing to recover a stale lock? Only one create succeeds. The lock prevents double-firing when three terminals share a project.

## Jitter (Thundering Herd Prevention)

The impressive part. Without jitter, all scheduled tasks fire at exactly :00 or :30, hammering the API.

### Why Jitter?

> When many sessions schedule the same cron string (e.g. `0 * * * *` → everyone hits inference at :00).

Thousands of Claude Code sessions, all scheduling "check my PRs every hour", all firing at :00:00. The API would see load spikes.

### Deterministic Jitter

```typescript
function jitterFrac(taskId: string): number {
  const frac = parseInt(taskId.slice(0, 8), 16) / 0x100000000
  return Number.isFinite(frac) ? frac : 0
}
```

Task IDs are 8-hex-char UUID slices. Parsing as u32 gives a uniform distribution in [0, 1). **Same task ID always gets the same jitter.** No coordination between processes, yet load spreads uniformly.

### Recurring Task Jitter

```typescript
function jitteredNextCronRunMs(cron, fromMs, taskId, cfg): number | null {
  const t1 = nextCronRunMs(cron, fromMs)  // First match
  const t2 = nextCronRunMs(cron, t1)      // Second match (to get interval)

  // Delay proportional to interval, capped
  const jitter = Math.min(
    jitterFrac(taskId) * cfg.recurringFrac * (t2 - t1),
    cfg.recurringCapMs,
  )
  return t1 + jitter
}
```

Defaults:
- `recurringFrac: 0.1` — up to 10% of interval
- `recurringCapMs: 15 min` — never more than 15 min delay

Hourly task: up to 6 min delay (10% of 1 hour, capped at 15 min). Per-minute task: up to a few seconds.

### One-Shot Task Jitter (Backward!)

User-pinned times ("remind me at 3pm") shouldn't be delayed — but firing slightly early is invisible:

```typescript
function oneShotJitteredNextCronRunMs(cron, fromMs, taskId, cfg): number | null {
  const t1 = nextCronRunMs(cron, fromMs)

  // Only jitter minute boundaries matching mod (default: :00 and :30)
  if (new Date(t1).getMinutes() % cfg.oneShotMinuteMod !== 0) return t1

  // Early fire: floor + frac * (max - floor)
  const lead = cfg.oneShotFloorMs + jitterFrac(taskId) * (cfg.oneShotMaxMs - cfg.oneShotFloorMs)
  return Math.max(t1 - lead, fromMs)  // Never fire before creation time
}
```

Defaults:
- `oneShotMinuteMod: 30` — only `:00` and `:30` get jitter (humans round to half-hour)
- `oneShotMaxMs: 90 s` — up to 90 seconds early
- `oneShotFloorMs: 0` — minimum 0 seconds early

"Remind me at 3pm" fires at 2:58:30, not 3:01:30. User intent preserved, load spread.

### GrowthBook Ops Lever

During an incident, ops can push new jitter config without restarting clients:

```typescript
type CronJitterConfig = {
  recurringFrac: number       // Fraction of interval
  recurringCapMs: number      // Max delay
  oneShotMaxMs: number        // Max early fire
  oneShotFloorMs: number      // Min early fire
  oneShotMinuteMod: number    // Which minutes get jittered
  recurringMaxAgeMs: number   // Auto-expiry
}
```

Config fetched every 60s from GrowthBook. During a :00 spike, ops can widen `oneShotMinuteMod` to 15 (spread :00/:15/:30/:45) and `oneShotMaxMs` to 5 minutes. Fleet converges within a minute.

## Task Storage

### Two Storage Layers

1. **File-backed** (`durable: true`): Persisted to `.claude/scheduled_tasks.json`
2. **Session-only** (`durable: false`): In-memory via bootstrap state, dies with process

Session-only tasks are useful for temporary reminders that shouldn't survive a restart.

### File Format

```json
{
  "tasks": [{
    "id": "a1b2c3d4",
    "cron": "*/5 * * * *",
    "prompt": "check the deploy",
    "createdAt": 1234567890000,
    "lastFiredAt": 1234567920000,
    "recurring": true,
    "permanent": false
  }]
}
```

`lastFiredAt` is written after each recurring fire so next process spawn can reconstruct the schedule.

## Missed Task Detection

```typescript
function findMissedTasks(tasks: CronTask[], nowMs: number): CronTask[] {
  return tasks.filter(t => {
    const next = nextCronRunMs(t.cron, t.createdAt)
    return next !== null && next < nowMs
  })
}
```

A task is "missed" when its next scheduled run (from createdAt) is in the past. Only checked on startup.

For missed one-shot tasks:
1. Show notification: "The following task was missed while Claude was not running"
2. Ask user whether to run now
3. Task already deleted from file before model sees notification

## Auto-Expiry

```typescript
function isRecurringTaskAged(t: CronTask, nowMs: number, maxAgeMs: number): boolean {
  if (maxAgeMs === 0) return false  // Unlimited
  return Boolean(t.recurring && !t.permanent && nowMs - t.createdAt >= maxAgeMs)
}
```

Default: 7 days. Recurring tasks older than 7 days are deleted after their next fire.

Reason from code comment:

> Cron is the primary driver of multi-day sessions... unbounded recurrence lets Tier-1 heap leaks compound indefinitely.

Without expiry, "check my PRs every hour" tasks from months ago would accumulate. The 7-day default covers "this week" workflows.

Exception: `permanent: true` (assistant mode only) never ages out.

## File Watching

```typescript
watcher = chokidar.watch(path, {
  persistent: false,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 300 },
})

watcher.on('add', () => void load(false))
watcher.on('change', () => void load(false))
watcher.on('unlink', () => { tasks = []; nextFireAt.clear() })
```

300ms stability threshold prevents partial-write reloads. File changes reflected in next tick.

## Brief

Cron scheduling in Claude Code is a distributed system with five key guardrails:

1. **DST-aware calculation** — Minute-by-minute walk handles spring-forward gaps. The gap hour "never appears" so the check fails and moves on.

2. **Cross-process lock** — File-based lock with PID liveness probe. Multiple terminals in same project don't double-fire tasks.

3. **Deterministic jitter** — Task ID as random seed. Same task always gets same delay, no coordination needed, uniform distribution.

4. **Backward jitter for pinned times** — "Remind me at 3pm" fires at 2:58:30, not 3:01:30. User intent preserved, load spread.

5. **Ops-ready config** — GrowthBook integration with bounds checking. During an incident, config pushed mid-session takes effect within 60 seconds.

What makes this impressive isn't the cron parsing — that's standard. It's the operational awareness:
- "Humans round to half-hour" → only jitter :00 and :30 by default
- "Thundering herd at :00" → deterministic jitter spreads load uniformly
- "Multiple terminals sharing a project" → file-based lock prevents double-fire
- "Unbounded recurrence leaks heap" → 7-day auto-expiry with escape hatch
- "During an incident" → GrowthBook config converges in 60s without restarts

Each guardrail addresses a specific operational concern. The code reads like a log of incidents that happened and were handled.
