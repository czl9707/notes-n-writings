---
title: Container Network
tags: [container, linux, network]
created-date: 2025-08-19T00:00:00-04:00
last-modified-date: 2025-08-22T00:00:00-04:00
---

By default, processes running in root space cannot access processes running within container. By using port forwarding or different type of network drivers, we can have granular control over container network.

Although less often (at least me), container network can be created using `docker network create <network_name>`.

## Driver

``` bash
docker network create [-d driver] <network_name>
```

When creating network, type of driver can be specified. This will define the network relationship among the containers inside the network and the outside world.

- `bridge`: The default network driver. Containers are connected to a [bridge](note/by/developer/linux_network.md#Bridge) device. They by default do not have access to the outside world, but are able to talk to each other using container IP and container name.
	- A [DNS](note/by/developer/network_protocols.md#DNS) server is built-in and connected to the bridge, so that the container name can be resolved into the defined container name.
- `none`: Just do nothing, containers are completely isolated.
- `host`: Containers within the network will share the same network as hosts, which means container can be accessed on `localhost:port`.
- `IPvlan`: Provides the configurability of the IPv4 or IPv6 addresses.
- `Macvlan`: Provides the configurability of the MAC addresses.

## DNS

Network inherit the host `/etc/resolv.conf` DNS config file by default. The custom bridge network also provide its own internal DNS resolution on top of that. Option `--hostname fancy.host` explicitly set up the hostname of the container, which default to be the container id.

Sometime we see something like `--dns=0.0.0.0`, this explicitly disable DNS lookup by setting it as `0.0.0.0` inside the network, which likely do not have DNS server running there. Note, using `127.0.0.1` has the same effect.

## Container

By default each container come with its own network [namespace](as/developer/notes/linux_namespace.md), for each network it dwells inside, a [veth](note/by/developer/linux_network.md#VETH) device got created, one side attached to the network, one side is located inside the container namespace.

Minimal Example to mimic a container network:

``` bash
ip netns add myContainerNS

ip link add vethA type veth peer name vethB
ip link set dev vethA up
ip link set dev vethB up

ip link set vethA netns myContainerNS
```

Actually the network namespace cannot be found using `ip netns` if the container is created using `docker` command line. A symlink need to be created to get this working.

### Port Forwarding

Container by default is not accessible from the external world. One way to expose it forwarding the port the process is listening on to the host. There are multiple syntax available:

- `docker run -p 8080 nginx`
- `docker run -p 8080:80 nginx`
- `docker run -p 127.0.0.1:8080:80 nginx`
- `docker run -p 8080:80/tcp nginx`

### `network_mode` Option

``` yaml
services:
	my-service:
		network_mode: "service: my-other-service"
```

There is an option `network_mode` in docker compose recipe, which can alter the network namespace behavior. by specifying `"service: my-other-service"`, docker engine will reuse the same network namespace of `my-other-service` for `my-service`.
