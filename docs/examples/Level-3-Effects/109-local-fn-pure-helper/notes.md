# 109 — Local fn pure helper

**Concept:** Local n as a pure helper inside a flow

n is a local helper defined inside a low. It is not a top-level declaration. Here it captures no effects — pure logic only.

**AI rule:** n is a local helper inside a flow. It cannot be declared at the top level.
