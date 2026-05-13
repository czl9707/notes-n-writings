---
title: "How Hermes-Agent Evolves Over Time"
description: Hermes-Agent claims to be "the agent that grows with you". It's not marketing — it's three counters, a background fork, and a 100-line prompt.
cover: media/covers/learn-from-claude-code-cover.svg
tags: [agent, ai]
featured: false
created-date: 2026-05-13T00:00:00-04:00
last-updated-date: 2026-05-13T18:43:17-04:00
---

> [Openclaw](blog/by/developer/understand_openclaw_by_building_one_1.md) proved that agents can do things, Hermes Agent proved that agents can remember and learn.
> -- Someone from Internet

I heard about this when [Hermes-Agent](https://github.com/NousResearch/hermes-agent) started gaining its momentum, but never looked into that. At the face, Hermes-Agent creates, patches skills as our conversation going.

At the last day of my vacation, I decided to open its codebase and take a look how this is achieved.

## Where Skill Are Created?

This blog assume some knowledge about the basic components of an AI agent. If not, consider reading [my earlier blog](blog/by/developer/understand_openclaw_by_building_one_1.md) and its [corresponding project](https://github.com/czl9707/build-your-own-openclaw) to grab some key aspects about it.

If you even used Hermes-Agent, you will noticed skill got created while chatting with the agent.

My first guess is that there is a tool registered for skill creation, or the skill toolset have some magic system prompt. But turns out, skills are created **as part of chat loop** gated by indicator.

```python
# run_agent.py
class AIAgent:
	def run_conversation(self, ...):
		# thousands lines of code ...
		_should_review_skills = False
		if (self._skill_nudge_interval > 0
		        and self._iters_since_skill >= self._skill_nudge_interval
		        and "skill_manage" in self.valid_tool_names):
		    _should_review_skills = True
		    self._iters_since_skill = 0
		    
		if final_response and not interrupted and (_should_review_memory or _should_review_skills):
			try:
				self._spawn_background_review(
					messages_snapshot=list(messages),
					review_memory=_should_review_memory,
					review_skills=_should_review_skills,
				)
			except Exception:
				pass
```

basically it is saying at the end of the chat loop, every N iteration, review the conversation and update skills. And as you might already noticed, **memory update follow the same pattern**.

## How Skill Are Created?

Short answer is [forked agent](blog/by/developer/learn_from_claude_code_agent_spawning.md#Fork%20Mode) similar to what Claude Code have, although I don't who implemented this first.

``` python
def _spawn_background_review(
	self,
	messages_snapshot: List[Dict],
	review_memory: bool = False,
	review_skills: bool = False,
) -> None:
	# ...
	if review_memory and review_skills:
		prompt = self._COMBINED_REVIEW_PROMPT
	elif review_memory:
		prompt = self._MEMORY_REVIEW_PROMPT
	else:
		prompt = self._SKILL_REVIEW_PROMPT
		
	# ...
	review_agent = AIAgent(
		model=self.model,
		max_iterations=16,
		quiet_mode=True,
		platform=self.platform,
		provider=self.provider,
		api_mode=_parent_runtime.get("api_mode") or None,
		base_url=_parent_runtime.get("base_url") or None,
		api_key=_parent_runtime.get("api_key") or None,
		credential_pool=getattr(self, "_credential_pool", None),
		parent_session_id=self.session_id,
		enabled_toolsets=["memory", "skills"],
	)
	
	review_agent._memory_write_origin = "background_review"
	review_agent._memory_write_context = "background_review"
	review_agent.run_conversation(
		user_message=prompt,
		conversation_history=messages_snapshot,
	)
```

1. **Restricted toolset.** The review agent can only use `memory` and `skills` tools.
2. **Provenance tag.** `_memory_write_origin = "background_review"` is a `ContextVar` that flows through every tool call. Which tells the `skill_manage` tool to mark the created skill as agent-owned.

And the prompt is huge, so I will only pick essential pieces out and paste here:

 ``` markdown
Review the conversation above and update the skill library. Be ACTIVE — most sessions produce at least one skill update, even if small. A pass that does nothing is a missed learning opportunity, not a neutral outcome.
  
Signals to look for (any one of these warrants action):
  • User corrected your style, tone, format, legibility, or verbosity. 
  • User corrected your workflow, approach, or sequence of steps.
  • Non-trivial technique, fix, workaround, debugging path, or tool-usage pattern emerged that a future session would benefit from.
  • A skill that got loaded or consulted this session turned out to be wrong, missing a step, or outdated. Patch it NOW.

Preference order — prefer the earliest action that fits, but do pick one when a signal above fired:
  1. UPDATE A CURRENTLY-LOADED SKILL.
  2. UPDATE AN EXISTING UMBRELLA.
  3. ADD A SUPPORT FILE under an existing umbrella.
  4. CREATE A NEW CLASS-LEVEL UMBRELLA SKILL when no existing skill covers the class. The name MUST be at the class level. The name MUST NOT be a specific PR number, error string, feature codename, library-alone name, or 'fix-X / debug-Y / audit-Z-today' session artifact. If the proposed name only makes sense for today's task, it's wrong — fall back to (1), (2), or (3).

'Nothing to save.' is a real option but should NOT be the default.
 ```

## Who Created This Skill?

Skill users asked to create is fundamentally different from the skill grow from background review. The provenance system distinguishes that.

```python
# tools/skill_provenance.py
_write_origin: contextvars.ContextVar[str] = contextvars.ContextVar(
    "skill_write_origin",
    default="foreground",
)
BACKGROUND_REVIEW = "background_review"
```

When `skill_manage(action="create")` runs inside the background review fork, it checks this context:

```python
# tools/skill_manager_tool
from tools.skill_provenance import is_background_review
if is_background_review():
	mark_agent_created(name)
```

Two provenance classes, `background_review` ones are agent owned, other wise user-owned.

## What if it is a Bad Skill.

The skill library will bloated within blink, and skills created through background review is not necessarily ones user really need. The **curator** is a separate idle-triggered background task managing this, some what like a garbage collector for skills.

```python
# agent/curator.py
DEFAULT_INTERVAL_HOURS = 24 * 7     # runs every 7 days
DEFAULT_MIN_IDLE_HOURS = 2          # only when agent is idle
DEFAULT_STALE_AFTER_DAYS = 30       # stale after 30 days
DEFAULT_ARCHIVE_AFTER_DAYS = 90     # archived after 90 days
```

The curator only touches agent-created skills. It runs an auxiliary [LLM](note/by/developer/transformer.md) that reviews the skill collection. Transitions:

```
active → stale (30 days no activity) → archived (90 days)
```

## The Trajectory System

Hermes-Agent also has a trajectory system. `trajectory_compressor.py` and the `save_trajectories` flag collect conversation traces, compress them within token budgets, and output JSONL files for RL fine-tuning via Tinker-Atropos.

I did not plan to talk about the trajectory system here though, but it worth mention that it is the *other* evolution path. Model improvement through training data. It's orthogonal to the skill system. One happens at the model level, the other at the harness level.

## Brief

Every few turn in the chat loop, the agent will fork itself to review past conversion and decide to add or patch any skills as a background job. The skill created at background is marked as "agent owned", and a curator system review managing them at off-peak hour, mark some of them active, stale, or archive them.
