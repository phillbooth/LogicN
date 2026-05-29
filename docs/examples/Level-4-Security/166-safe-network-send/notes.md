# 166 — Safe network send

**Concept:** protected value may be sent over network (policy dependent)

A protected Email is validated data. Sending it to an approved internal service via http.post is valid at the type level. Whether it is permitted depends on governance policy — the compiler checks types, policy checks intent.

**AI rule:** Protected values are not automatically forbidden from network sends. Governance policy decides.
