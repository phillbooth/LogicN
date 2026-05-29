# 116 — Effect propagation missing in parent

**Concept:** Caller missing effect required by callee

processOrder has an empty effects list but calls saveOrder which declares database.write. The compiler requires the caller to declare the same effect to make the dependency explicit.

**AI rule:** If a callee declares an effect, the caller must declare it too.
