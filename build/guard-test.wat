(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; effectful flow: doubleIt
  (func $doubleIt (param $p0 i32) (result i32)
    (i32.add (local.get $p0) (local.get $p0))
  )

)