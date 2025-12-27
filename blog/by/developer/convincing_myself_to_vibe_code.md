---
title: Convincing Myself to "Vibe Code"
description: To vibe or not to vibe, that's the question. Draw the line between throwaway AI vibe coded prototypes and sustainable software engineering without losing your edge.
cover: Media/Covers/ConvincingMeVibeCodingCover.svg
tags: [ai, machine-learning]
featured: true
created-date: 2025-12-23T12:05:52-05:00
last-updated-date: 2025-12-26T21:56:45-05:00
---

For a long time, I held a firm line: **I would never give AI a task I didn't already know how to accomplish myself.** I viewed myself as the final gatekeeper of logic, the one who understood every gear and spring in the machine. If I didn't understand the "how," I couldn't own the "why."

I used AI assistants, certainly, but I used them as sophisticated autocomplete—never as the driver. I wasn't saying "no" to AI, but I was firmly saying "no" to **vibe coding**.

## The Vibe Hits the Door

"Vibe Coding" describes building applications through pure natural language intent rather than manual syntax. It entered my radar in late 2024, and to be honest, it felt like a buzzword for the lazy. That changed when I saw it in my own living room. My wife used **v0** to spin up a functional web app in under thirty minutes using a free tier.

It was far from perfect, ugly UI and brittle logic. **But it worked.** I used to proudly claim I could wire up a functional basic application within a day. She had just bypassed the hours of boilerplate and plumbing I usually pride myself on, right in front of me.

## Where It Thrives and Dies

Before this, I found that AI seldom had enough intelligence to help me fix a nuanced bug or upgrade a specific package. Naturally, I thought:

> "If you aren't able to even fix a bug, how can you build an app for me?"

This mindset held me back for a long while. After the astonishing moment in my living room, and discovering this a bit, this helped me categorize where AI actually excels.

It is the undoubtable king of the **kickstart**. Generating boilerplates, wiring up initial stubs, solving extremely well-defined problems are what it really good at.

But the "vibe" has a ceiling. It suffers in the **enterprise environment**. Once you introduce complex business logic, massive existing codebases, and legacy systems that have been patched for a decade, AI starts hallucinating. In a poorly designed system or a repo with 100k+ lines of code, AI suggestions often make zero sense. It can't "feel" the weight of ten years of technical debt.

## Why We Say No

If you ask me why I originally said no to vibe coding, the honest answer isn't just about AI's technical capabilities. It's about our identity.

### The Quality Trap

We see the "garbage" code these tools generate, the lack of patterns, the duplication, the messy file structures, and we recoil. As engineers, we were trained to control the details. Giving that up feels like a betrayal of our craft.

### The Fear of the Unknown

AI has the momentum to push things fast. It introduces solutions or libraries I haven’t used. If I don't understand every mechanism under the hood, I feel like I'm losing my edge. It’s a philosophical hurdle: _Is it necessary to understand every line?_ To me, the answer was always **yes**. An unknown piece of code inside my project felt like a landmine waiting to go off.

### The Ego Check

There is a genuine, uncomfortable sense of professional jealousy. It feels "unfair" that a non-technical person can bypass the years of struggle I went through to learn a framework just by paying $20 for a subscription. Dismissing vibe coding as "not real work" makes me feel better about my own investment.

## Is Code Quality Really a Problem?

Vibe-coded projects are doomed to be short-lived, having a destiny of death. They are built for testing, either an idea or the tool itself. If the idea fails, the code dies in the "404 river" silently. If the idea succeeds, it gets rewritten by an engineer.

**From an engineer's perspective**, are we really care about code quality for a short-lived piece of code? I write quick bash scripts or throwaway python scripts pretty often, and I don't care about the quality of them. If I can accept a messy script for a 10-minute task, why can't I accept a vibe-coded prototype for a 1-day validation?

**From a non-technical user's perspective**, a big population of vibe coder do not have technical background and likely will never have. They probably will never look into the codebase. What matters is they can test the idea without hiring an engineer.

A big proportion of this group of users are PMs and designers, they get a tool for them to verify ideas in a shorter time frame, which have nothing to do with engineers. To some extent, this reduces the amount of "thrown away" engineer work we have to do.

## Defining Software Engineering

**Software Engineering is more than just kickstarting applications; the vast majority of the job is maintaining them.** This is not something new I learnt, but re-visiting this helped me regain my confidence. If AI handles the "start," the engineer’s value shifts toward **sustainability.** Engineering is about refactoring the "vibe" into a maintainable form. It’s about designing systems that can survive the second year, not just the first weekend.

## Drawing the Line

AI can be a magic trick or a productivity tool. The line is blurry, but drawing it clearly helps me increase my productivity without losing my identity as an engineer.

- **The Vibe Side:** Use AI for exploration, rapid prototyping, and verification. If a PM wants to "vibe" to verify an idea, let them. That code is for short-term usage only.
- **The Engineer Side:** Use AI to implement **stubs**, fix **scoped bugs**, **learn** new patterns, set up **boilerplate**, anything well-defined and beneficial to one as an engineer.

I’m still a conservative engineer. I still care about the details. But realize the difference between disposable toys and real engineering products. By allowing AI to handle the "vibe", I can save my energy for the real engineering, the parts where the details actually matter.
