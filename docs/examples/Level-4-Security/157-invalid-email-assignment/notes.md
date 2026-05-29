# 157 — Invalid Email assignment

**Concept:** Assigning String directly to protected Email is forbidden

awEmail is a String. Assigning it directly to protected Email bypasses the validation gate. The compiler rejects this to enforce the trust boundary.

**AI rule:** Cannot assign String directly to Email. Use alidate.email(...).
