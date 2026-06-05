(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: clampRange
  (func $clampRange (param $p0 i32) (param $p1 i32) (param $p2 i32) (result i32)
      ;; --- invariant pre-conditions (LLN-INV-001 gate) ---
      (if (i32.eqz (i32.gt_s (local.get $p2) (local.get $p1))) (then unreachable)) ;; ensure max > min
    (if (i32.lt_s (local.get $p0) (local.get $p1))
      (then
        (return (local.get $p1))
      )
    )
    (if (i32.gt_s (local.get $p0) (local.get $p2))
      (then
        (return (local.get $p2))
      )
    )
    (local.get $p0)
      ;; --- invariant post-conditions (LLN-INV-002 gate) ---
      (if (i32.eqz (i32.gt_s (local.get $p2) (local.get $p1))) (then unreachable)) ;; post: ensure max > min
  )
  (export "clampRange" (func $clampRange))

)