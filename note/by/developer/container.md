---
title: Container
tags: [container]
created-date: 2025-08-14T00:00:00-04:00
last-modified-date: 2025-08-21T00:00:00-04:00
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

Implemented using [namespace](as/developer/notes/linux_namespace.md)s and [CGroup](as/developer/notes/linux_control_group.md).

- namespaces enforce the resources a process sees.
- CGroup (Control Group) groups processes and allocates resources (CPU and Memory) that the kernel enforce.

Aspects of container:

- [Container Network](note/by/developer/container_network.md)
- Container Volume
- Container Processes

## Docker

Container is a technology exist way ahead, Docker did not invent container, but bring standards to container. `Dockerfile` defines the image. `docker compose` define the composable workflow.

## Composable Workflow

### [Docker Compose](https://docs.docker.com/compose/)

`docker-compose.yaml` or `compose.yaml` together with `docker compose` CLI can be used to run define and run multi-container applications. Container images, network mesh, filesystem volumes, environment variable, and other aspects, all can be defined within the `.yaml` file.

### [Container Lab](https://containerlab.dev/)

Different from `docker-compose`, container lab is not meant for running application, but for network experiments. It allows setting up low level network devises inside container, and bridging across different containers and etc.
