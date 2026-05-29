# 302 — Compute deny remote

**Concept:** denying remote execution in a secure credit-scoring flow

`deny [remote.execution]` prevents the runtime from dispatching the inference to any remote endpoint. Combined with `prefer [npu, gpu, cpu]`, this ensures the model runs entirely on local hardware, satisfying data-residency and compliance requirements.

**AI rule:** Use `deny [remote.execution]` for data that must not leave the device.
