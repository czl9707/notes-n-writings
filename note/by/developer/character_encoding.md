---
title: Character Encoding
tags: [miscellaneous]
created-date: 2025-09-09T21:06:36-04:00
last-updated-date: 2025-10-18T22:39:43-04:00
---

## ASCII

**ASCII** is the first character encoding system, and the entire system is established around English language. Give the most used characters, ASCII only use 7 bits to represent the whole character sets.

One interesting is that `A` is assigned as `65`, which is represented as `01000001`, and 'a' as 97 which is `01100001`, which only have one different digits in their binary sequence.

## Unicode

[ASCII](#ASCII) hit its limit pretty soon, even with one byte of size, it can at most represent 256 characters, which is far from enough in a single language link Chinese, Japanese, and etc. Before Unicode become the standard character encoding on web, even one language can have multiple way of encoding characters, which brought a lot of problems.

Unicode essentially is a huge map for (almost) all characters in the world, no matter languages. Currently Unicode has collect more than 150K characters, and each one can be represented as `U+####`. For example, `L` will be `U+004C`, where `004C` is the hex code of 76.

## UTF-8

Just by assigning different character a different number won't help too much. There are several challenge to push [Unicode](#Unicode) to wider audience:

- Backward compatibility to [ASCII](#ASCII).
- Space for a single character can grow 4 times bigger for English characters.
- Some protocols treat 8 consecutive `0`s as end of stream.

ASCII only need 7 bits, so the first bit is always 0. **UTF-8** take advantage of this, using the first few bits to infer the encoding structure.

- `0#######`: the character only occupy 1 byte.
- `10######`: this is not the first byte of the character.
- `110#####`: this is the first byte of the character, and the character occupy 2 bytes.
- `1110####`: this is the first byte of the character, and the character occupy 3 bytes.
- `11110###`: this is the first byte of the character, and the character occupy 4 bytes.

On top of that, A **Byte Order Mark (BOM)** may or may not be added to the start of the entire sequence, to indicate the encoding is **big-endian** or **little-endian**.

``` python
print("L".encode("utf-8").hex())  # 4c
print("😁".encode("utf-8").hex()) # f09f9881
# f09f9881 => 11110000 10011111 10011000 10000001
```

## UTF-16 & UTF-32

While UTF-8 can have character encoded into 1-4 bytes. UTF-16 will encode them into either 2 or 4 bytes. UTF-32 will encode everything into 4 bytes.
