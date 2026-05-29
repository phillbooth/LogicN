# 167 — Unsafe network send

**Concept:** unsafe value crossing a trust boundary via network

Sending awEmail (an unvalidated unsafe String) to an external endpoint is a security error. All values must be validated before they cross a trust boundary.

**AI rule:** Unsafe values cannot cross trust boundaries. Validate before sending externally.
