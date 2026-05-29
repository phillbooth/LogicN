# 103 — Guarded flow with network.outbound

**Concept:** guarded flow declaring 
etwork.outbound effect

Outbound network calls (HTTP, RPC, etc.) require the 
etwork.outbound effect declaration. The response is received as unsafe data that must be decoded and validated before use.

**AI rule:** Declare 
etwork.outbound when making outbound HTTP or network calls.
