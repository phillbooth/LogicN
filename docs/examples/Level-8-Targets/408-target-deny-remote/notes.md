# 408 — Target deny remote

**Concept:** denying remote.execution placement category

`deny [remote.execution]` is evaluated after the `prefer` list — any target that would result in remote execution is excluded before the runtime selects a device. This is independent of the `prefer` list contents.

**AI rule:** `deny [remote.execution]` blocks any remote dispatch, regardless of what appears in the `prefer` list.
