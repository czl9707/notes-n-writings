---
title: Container
tags: [container]
created_date: 2025-08-14
last_modified_date: 2025-08-16
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

Container is a technology exist way ahead, Docker did not invent container, but bring standards to container. `Dockerfile` defines the image.

Skipping the syntax and usage for now...

## Composable Workflow

### [Docker Compose](https://docs.docker.com/compose/)

`docker-compose.yaml` or `compose.yaml` together with `docker compose` CLI can be used to run define and run multi-container applications. Container images, network mesh, filesystem volumes, environment variable, and other aspects, all can be defined within the `.yaml` file.

### [Container Lab](https://containerlab.dev/)

Different from `docker-compose`, container lab is not meant for running application, but for network experiments. It allows setting up low level network devises inside container CGroup, and bridging across different containers and etc.
