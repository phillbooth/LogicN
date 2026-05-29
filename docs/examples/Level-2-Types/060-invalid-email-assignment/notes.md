# 060 — Invalid Email assignment

**Concept:** Direct assignment to protected Email is forbidden

A raw String (or unsafe string) cannot be assigned to protected Email without going through the validation gate alidate.email(...). The compiler enforces this to prevent unvalidated data from entering typed domain flows.

**AI rule:** You cannot assign an unvalidated String to a protected type. Use alidate.email(...).
