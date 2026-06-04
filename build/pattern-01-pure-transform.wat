(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: scoreToGrade
  (func $scoreToGrade (param $p0 i32) (result i32)
    (if (i32.ge_s (local.get $p0) (i32.const 90))
      (then
        (return (i32.const 0) ;; unhandled: stringLiteral)
      )
    )
    (if (i32.ge_s (local.get $p0) (i32.const 80))
      (then
        (return (i32.const 0) ;; unhandled: stringLiteral)
      )
    )
    (if (i32.ge_s (local.get $p0) (i32.const 70))
      (then
        (return (i32.const 0) ;; unhandled: stringLiteral)
      )
    )
    (i32.const 0) ;; unhandled: stringLiteral
  )
  (export "scoreToGrade" (func $scoreToGrade))

  ;; pure flow: classify
  (func $classify (param $p0 i32) (result i32)
    (if (i32.lt_s (local.get $p0) (i32.const 0))
      (then
        (return (call $Err (i32.const 0) ;; unhandled: stringLiteral))
      )
    )
    (if (i32.gt_s (local.get $p0) (i32.const 100))
      (then
        (return (call $Err (i32.const 0) ;; unhandled: stringLiteral))
      )
    )
    (if (i32.ge_s (local.get $p0) (i32.const 50))
      (then
        (return (call $Ok (i32.const 0) ;; unhandled: stringLiteral))
      )
    )
    (call $Ok (i32.const 0) ;; unhandled: stringLiteral)
  )
  (export "classify" (func $classify))

)