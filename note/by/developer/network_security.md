---
title: Network Security
tags: [network]
created-date: 2025-08-17T00:00:00-04:00
last-updated-date: 2025-08-18T00:00:00-04:00
---

## Message Integrity

The message received should not be modified since sent.

### HMAC

**HMAC** (Hash-keyed Message Authentication Code) is a method to keep message integrity.
Given sender and receiver share a secret key, senders use the key to perform hash on message and append the hash to end of the message. And receivers perform hash on the message and compare that with the one sender sent. If they are the same, then the message is not modified.

### Digital Signatures

Digital Signature is a smart application of [Asymmetric Encryption](note/by/developer/cryptography_basic.md#Symmetric%20&%20Asymmetric%20Encryption). To prove the message is sent by some authority, the authority distribute a public key, and using the private they have to sign (encrypt) the message, and only that public key can verify (decrypt). If the decryption is successful, then it proves that the message sender hold the private key pairing to the public key.

### Digital Certificate

A bind between public key and identity. Or, the one sending a message can decrypt using this public key, is the corresponding identity.

### Certificate Chain & Certificate Authority

Zane, as a nobody, the certificate I issued won't make any sense, since everyone can make modification to it and say that's Zane's. The solution is having some certified authority to verify Zane's identity and use its private key to sign my certificate. Thus anyone with CA's public key trusted can use that to verify Zane's certificate.

## Message Confidentiality

The message sent should not be read by others. Eavesdropping is un-acceptable in a lot of scenarios. And many reasons can cause message ended up in others' network interface.

- Wi-Fi is broadcast communication by design.
- Network provider compelled by government agency or has a rogue employee or a compromised router.
- Route hijacking to intentionally redirect traffic.

### TLS

Taking advantage of both [Symmetric & Asymmetric Encryption](note/by/developer/cryptography_basic.md#Symmetric%20&%20Asymmetric%20Encryption) to encrypt the message end to end, TLS is built on top of TCP three way handshake:

- Client Hello, telling server of what ciphers and algorithms it support and prefer.
- Server Hello, picking parameters.
- Server Certificate, sending its digital certificate signed by a CA.
- Server Hello Done, indicating it is done with TLS handshake.
- Client Key Exchange, Use the public key sent by server to encrypt the session key, and send that to server.
- Client Cipher Spec: Exchange the cipher parameters it agreed upon again. All message following will be encrypted using the session key exchanged before.

### IPsec

Protecting communication by creating an encrypted tunnel between two end points. Very common used in VPN communication.

A protocol (ISAKMP/IKE) is used to set up the parameters and keys used, or called **SA** (Security Association), and authenticate each side as well.

- **SA-1 Parameter Exchange**: What algorithms it supports?
- **Diffie Hellman Key Exchange**: DH is a protocol to secretly create and share private keys. Here we used DH Key Exchange to create keys for encryption and integrity.
- **Authentication & SA-2 Parameter Exchange**:
	- Verify each side is communicating with who they think they are.
	- Exchange private key and digital certificate.
	- Set up SA for traffic exchange, in case different parameters are desired.
	- Set up what traffic is allowed through the tunnel IP src/dest, protocol, port src/dest.
- **Encrypted Traffic**

#### Why IPsec While We Already Have HTTPS/TLS?

[TLS](#TLS) is in [Transport Layer](note/by/developer/computer_network_basic.md#Layers%20of%20Computer%20Network), while IPsec provides a lower level security, which is in [Link Layer](note/by/developer/computer_network_basic.md#Layers%20of%20Computer%20Network).

### Man in the Middle

Attacker can inject fake paths in [Layer 3](note/by/developer/computer_network_basic.md#Layers%20of%20Computer%20Network), traffic might get routed to the malicious router, and attacker can deny service, change messages, inspect traffic and etc.

### RPKI

- **RPKI** stands for "Resource Public Key Infrastructure".
- **RIR**s (Regional Internet Registries) are the ones that allocate IP address space, who have great confidentiality. They are established as CAs.
- IP owners create public/private key pair and digital certificate, and send to RIRs for identity verification.
- RIRs store a entry in Resource Ownership Authorization in a DB.
- A Validator runs in an AS deploying RPKI downloads ROAs and verifies the signatures.
- By validating IP prefix and signature, router can prevent malicious router get added in [Layer 3](note/by/developer/computer_network_basic.md#Layers%20of%20Computer%20Network) routing behavior.