# 118 — Filesystem read guarded

**Concept:** guarded flow with ilesystem.read effect

s.readText requires ilesystem.read to be declared. The raw file content is received as unsafe and decoded before use.

**AI rule:** Declare ilesystem.read when reading from the filesystem.
