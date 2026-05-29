# 207 — Protected data sharing missing authority

**Concept:** Sending protected data externally without uthority block

Sending patient.referralPacket (which contains protected data) to an external endpoint without an uthority block is a governance violation. The policy engine requires explicit authority for all external protected data flows.

**AI rule:** Protected data cannot be sent externally without an uthority block granting permission.
