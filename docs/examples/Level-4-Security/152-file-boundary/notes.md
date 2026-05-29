# 152 — File boundary

**Concept:** File content enters as unsafe

Data read from the filesystem is external and untrusted. File.read returns content that must be declared unsafe let at the trust boundary.

**AI rule:** External files are unsafe. Use unsafe let for data read from the filesystem.
