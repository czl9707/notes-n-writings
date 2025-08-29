---
title: Kubernetes
tags: [container, kubernetes]
created-date: 2025-08-21
last-modified-date: 2025-08-21
---

Kubernetes (K8s) is an [container](note/by/developer/container.md)-orchestration system. Which provides deployment management to container applications in scale, managing deployment strategy, system resources usage, responsive scaling, and ingress / egress management, failure handling and etc.

## Architecture

### Concepts

- **Cluster**: All machines (nodes) sharing the same Kubernetes control plane.
- **Node**: Each worker machine is considered as a node in Kubernetes.
- **Service**: Service is a group of pod running under same setup, is abstraction which defines a logical set of Pods and a policy by which to access them.
- **Pod**: The working unit in Kubernetes. A pod consists of one or more containers, managed by Kubernetes as a whole.
- **Deployment**: A deployment is a service with its desired deployment state. Kubernetes will scale up and down to the status automatically based on the configured criteria.

### Control Plane

The control plane can live on one or more nodes. If living on multiple nodes, they are managed using consensus algorithm Raft.

#### API Server

**API Server** servers as the front door of Kubernetes. All requests go through API server, and it will update [ETCD](#ETCD) with the latest desired state value.

#### ETCD

[ETCD](https://github.com/etcd-io/etcd) is not only used in Kubernetes, but widely used in cloud environment. It is a distributed reliable key-value store, storing the container desired state in the context of Kubernetes.

#### Controller Manager

**Controller Manager** keeps running controllers to compare the desired state in ETCD and the current state. If the corresponding controller find a difference between them, it will update ETCD with new object information using API Server.

For example, deployment controller will create extra pods when seeing the desire state requires more pods then the current state.

There are many types of controller though...

#### Scheduler

**Scheduler** is the decision-maker of where to place pod, based on resources, affinity and etc. It listens on the API Server for newly defined pod, and notify API Server about the decision of where to place the pod.

### Node Components

Components live on worker nodes are doing the actual jobs, following commands from the API Server.

#### Kubelet

**Kubelet** ensure containers are running in its desired state, and reporting node and pod status back to the API server. And if new pod got created in ETCD, the corresponding Kubelet instance get notified by API Server and run pods correspondingly.

## Tools

- [Kind](https://kind.sigs.k8s.io/): Instead of running K8s on multiple machines, **Kind** spins up Docker containers to be treated as [node](#Nodes)s.
- [kubectl](https://kubernetes.io/docs/reference/kubectl/): The command line interface used to manage Kubernetes cluster. Similar to `docker compose` to some extent.