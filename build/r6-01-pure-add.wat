(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: gaussSum
  (func $gaussSum (param $p0 i32) (result i32)
    (i32.div_s (i32.mul (local.get $p0) (i32.add (local.get $p0) (i32.const 1))) (i32.const 2))
  )
  (export "gaussSum" (func $gaussSum))

)