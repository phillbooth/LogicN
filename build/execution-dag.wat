(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; effect: audit.write
  (import "host" "audit.write" (func $host_audit_write (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: audit.write
  (import "host" "audit.log" (func $host_audit_log (param $p0 i32) (param $p1 i32) (result i32)))

  ;; pure flow: helperA
  (func $helperA (param $p0 i32) (result i32)
    (i32.add (local.get $p0) (i32.const 1))
  )
  (export "helperA" (func $helperA))

  ;; pure flow: helperB
  (func $helperB (param $p0 i32) (result i32)
    (i32.mul (local.get $p0) (i32.const 2))
  )
  (export "helperB" (func $helperB))

  ;; effectful flow: orchestrator
  (func $orchestrator (param $p0 i32) (result i32)
    unreachable
  )

)