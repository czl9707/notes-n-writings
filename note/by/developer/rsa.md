---
title: RSA
tags:
  - security
  - algorithm
created-date: 2026-07-26T00:00:00-04:00
last-updated-date: 2026-07-30T09:18:45-04:00
aliases:
  - RSA Encryption
---

RSA is an [Asymmetric Encryption](note/by/developer/cryptography_basic.md#Symmetric%20&%20Asymmetric%20Encryption) scheme. Its security rests on the difficulty of factoring the product of two large primes.

## Bézout's Identity

For any integers $a, b$ (not both zero), there exist integers $s, t$ such that

$$
\gcd(a, b) = s \cdot a + t \cdot b
$$

The pair $(s, t)$ are the **Bézout coefficients**. A useful corollary:

- If $\gcd(a, b) = 1$ (i.e. $a, b$ are co prime), then $s \cdot a + t \cdot b = 1$.



## Euler's Totient Function

$\varphi(n)$ counts the integers in $\{1, \dots, n\}$ that are coprime to $n$.

Two properties do all the work:

- If $p$ is prime: $\varphi(p) = p - 1$ (everything from $1$ to $p-1$ is coprime to $p$).
- If $\gcd(m, n) = 1$: $\varphi(m \cdot n) = \varphi(m) \cdot \varphi(n)$ (multiplicative).

So when $n = p \cdot q$ for distinct primes $p, q$:

$$
\varphi(n) = \varphi(p) \cdot \varphi(q) = (p - 1)(q - 1)
$$

### Euler's Theorem

If $\gcd(a, n) = 1$, then

$$
a^{\varphi(n)} \equiv 1 \pmod n
$$

## RSA

Given the math above, RSA find $n$, $d$, $e$, which satisfied 

$$
(m^e)^d = m^{e d} = m^{k \cdot \varphi(n) + 1} = (m^{\varphi(n)})^k \cdot m \equiv 1^k \cdot m \equiv m \pmod n
$$

Where public key is $n$, $d$, and private key is $n$, $e$. Therefore, given public key and trying to calculate the private key eventually boils down to factoring a big number $n$, which is a problem can be only solved in exponential time.
### Key Generation

1. Pick two large distinct primes $p, q$.
2. Compute $n = p \cdot q$ (the **modulus**) and $\varphi(n) = (p - 1)(q - 1)$.
3. Choose public exponent $e$ with $1 < e < \varphi(n)$ and $\gcd(e, \varphi(n)) = 1$. (Commonly $e = 65537$.)
4. Compute private exponent $d \equiv e^{-1} \pmod{\varphi(n)}$ — via the Extended Euclidean Algorithm (Bézout again).
5. **Public key**: $(n, e)$. **Private key**: $(n, d)$. The primes $p, q$ and $\varphi(n)$ are discarded and kept secret.

### Encryption and Signature 

Given the math above, public key and private key can actually been used interchangeably. Using public key to encrypt can achieve encryption, using private key to encrypt can achieve an [Digital Signatures](note/by/developer/network_security.md#Digital%20Signatures)