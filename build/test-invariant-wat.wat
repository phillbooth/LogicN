(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: clampPositive
  (func $clampPositive (param $p0 i32) (result i32)
      ;; --- invariant pre-conditions (LLN-INV-001 gate) ---
      (if (i32.eqz (i32.gt_s (local.get $p0) (i32.const 0))) (then unreachable)) ;; ensure amount > 0
    (if (i32.le_s (local.get $p0) (i32.const 0))
      (then
        (return (i32.const 0))
      )
    )
    (local.get $p0)
      ;; --- invariant post-conditions (LLN-INV-002 gate) ---
      (if (i32.eqz (i32.gt_s (local.get $p0) (i32.const 0))) (then unreachable)) ;; post: ensure amount > 0
  )
  (export "clampPositive" (func $clampPositive))

)