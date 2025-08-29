---
title: Cryptography Basic
tags: [cryptography]
created_date: 2025-08-17
last_modified_date: 2025-08-17
---

## Symmetric & Asymmetric Encryption

- Symmetric encryption means using same key on both encryption and decryption side. It is computational more efficient, but having the challenge of sharing the encryption ahead of time.
	- Xor
- Asymmetric encryption means using different key for encryption and decryption. No need for passing the key over network and risking expose it, but asymmetric encryption is relatively slower comparing to symmetric one.
	- One more attribute about it is, the message encrypted with key A is only decryptable using the key B, and reversely, key B can only decrypt the message encrypted by key A.
	- [RSA](#RSA)

As a consequence, it is common to use asymmetric encryption to exchange a symmetric encryption key at the beginning, so that we can have the benefit from both side.

## RSA

- Given Public Key $(n, e)$ and Private Key $(n, d)$.
- Message `m` is a bit pattern interpreted as an integer
- To encrypt message m (<n), $c = m^e \ \ {mod} \ \ n$
- To decrypt received bit pattern, $m = c^d \ \ {mod} \ \ n$
- $n$, $e$, and $d$ are chosen in a way that this will work.