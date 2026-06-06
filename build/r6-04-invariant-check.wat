(module
  ;; effect: stdlib.result
  (import "host" "__result_ok" (func $host___result_ok (param $p0 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: clampedDivide
  (func $clampedDivide (param $p0 i32) (param $p1 i32) (result i32)
      ;; --- invariant pre-conditions (LLN-INV-001 gate) ---
      (if (i32.eqz (i32.ne (local.get $p1) (i32.const 0))) (then unreachable)) ;; ensure denominator != 0
        ;; trap: ERR_TRAP — fires if condition is TRUE
        (if (i32.eq (local.get $p1) (i32.const 0))
          (then unreachable) ;; LLN-INV-000 trapKind=ERR_TRAP
        )
    (i32.const 0) ;; unhandled stmt: block
    (call $host___result_ok (i32.div_s (local.get $p0) (local.get $p1)))
      ;; --- invariant post-conditions (LLN-INV-002 gate) ---
      (if (i32.eqz (i32.ne (local.get $p1) (i32.const 0))) (then unreachable)) ;; post: ensure denominator != 0
  )
  (export "clampedDivide" (func $clampedDivide))

)