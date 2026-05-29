# 409 — Target deny list

**Concept:** multiple denied target categories in a single deny clause

The `deny` clause accepts a list of placement categories. Here both `remote.execution` and `cloud.inference` are excluded, preventing dispatch to any cloud-hosted inference endpoint as well as generic remote processes.

**AI rule:** List all denied categories in a single `deny [...]` clause to make the exclusions explicit and auditable.
