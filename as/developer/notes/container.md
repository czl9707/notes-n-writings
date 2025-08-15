---
title: Container
tags: [container]
created_date: 2025-08-14
last_modified_date: 2025-08-14
---

## What is Container

Container is a black magic, creating an isolated environment. It is:

- A temporary file system.
	- Layered over an image.
	- Disappearing at the EOL.
	- Fully writable.
	- Allow mounting volume from user disk.
- A Network Stack
- A Process Group - One main process, with possible subprocesses.

Implemented using CGroup (Control Group).

## Docker & Container

Container is a technology exist way ahead, Docker did not invent container, but bring standards to container. `Dockerfile` defines the image. `docker-compose.yaml` or `compose.yaml` together with `docker compose` CLI to use composable workflow to control docker in scale.

Skipping their syntax and usage for now...