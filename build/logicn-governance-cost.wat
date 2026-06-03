(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: sumHelper
  (func $sumHelper (param $p0 i32) (param $p1 i32) (result i32)
    (if (i32.le_s (local.get $p0) (i32.const 0))
      (then
        (return (local.get $p1))
      )
    )
    (call $sumHelper (i32.sub (local.get $p0) (i32.const 1)) (i32.add (local.get $p1) (local.get $p0)))
  )
  (export "sumHelper" (func $sumHelper))

  ;; pure flow: triangleNumber
  (func $triangleNumber (param $p0 i32) (result i32)
    (call $sumHelper (local.get $p0) (i32.const 0))
  )
  (export "triangleNumber" (func $triangleNumber))

  ;; pure flow: main
  (func $main (result i32)
    (call $triangleNumber (i32.const 100))
  )
  (export "main" (func $main))

)