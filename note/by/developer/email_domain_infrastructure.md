---
title: Email Domain Infrastructure
tags: [network]
created-date: 2025-12-06T07:50:58-05:00
last-updated-date: 2025-12-11T20:31:19-05:00
---

There are multiple protocols and [DNS](note/by/developer/domain_name_server.md) setups are involved to hit the an email infrastructure working. And surprisingly, sending and receiving emails for a domain requires different set of infrastructure setup.

## DNS

### Domain Authentication

To receive email on a domain, such as `@my-domain.com`, the domain should be authenticated through DNS. Essentially claiming this domain is capable and can be trusted to receive email. There are multiple ways to authenticate the domain.

- **SPF**: **TXT Record** specifying the host names or public IPs can send email for this domain.
	- `v=spf1 include:mailgun.org include:amazonses.com -all`
- **DKIM**: **TXT Record** providing the [Asymmetric Encryption](note/by/developer/cryptography_basic.md#Symmetric%20&%20Asymmetric%20Encryption) information for the domain. The record includes the [public key](note/by/developer/cryptography_basic.md#Symmetric%20&%20Asymmetric%20Encryption). The email sent from this domain should signed using the corresponding private key.
	- `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ...`
- **DMARC**: **TXT Record** at `_dmarc.my-domain.com`. It indicates the receiver server to check the email using what specified in **SPF** and **DKIM** records, and take actions if it does not align.
	- `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@my-domain.com;`
	- The `p` value means for policy:
		- `p=none` - Take no action; deliver as usual.
		- `p=quarantine` - Send failed emails to the recipient's Spam/Junk folder.
		- `p=reject` - Block/Reject failed emails outright.

### Tracking Record

A record necessary for tracking opens, clicks, and unsubscribes. Can be one of these [Record Types](note/by/developer/domain_name_server.md#Record%20Types): `A`, `AAAA`, `CName`.

### MX

The **MX Record**s route incoming mail to email server(s). Each MX record contain a host name and a priority value.

## Email Server

This is just for understanding. It is really discouraged to implement and self-host email server, because the deliverability challenges involved.

- Major email providers (like Gmail, Outlook) use sophisticated filters which requires a clean IP reputation residential IP or any IP on public cloud can easily be tagged as spammers.
- Email sender server require [Reverse DNS Lookup](note/by/developer/domain_name_server.md#Reverse%20DNS%20Lookup) capability, which is mostly relying on Internet service providers to populate `PTR` record.

Emails are data defined in `.eml` file format. Which is separate standard defined apart from delivering Protocols.

``` eml
From: zane@my-domain.com
To: whoever@gmail.com
Subject: test
Date: Sun, 8 Jan 2025 20:36:33 +0200

Whatever!
```

### SMTP

**SMTP** stands for **Simple Mail Transfer Protocol**. It is the only [protocol](note/by/developer/network_protocols.md) used for **sending** outbound mail. It's used by email client to push the message to outgoing mail server, and then by that server to relay the message across the internet to the recipient's mail server.

### POP3

**POP3** stands for **Post Office Protocol version 3**. POP3 is an older, simpler protocol primarily designed for a single-device environment. The email server do not preserve messages. All messages will be deleted once retrieved by client.

### IMAP

**IMAP** stands for **Internet Message Access Protocol**. It allows the mail client to access and manage email messages and folders directly on the mail server. Any action taken (marking as read, moving to a folder, deleting) is immediately reflected on the server and synced to all other connected devices.

