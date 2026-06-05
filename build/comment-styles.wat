(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: addNumbers
  (func $addNumbers (param $p0 i32) (param $p1 i32) (result i32)
    (local $result i32)
    (local.set $result (i32.add (local.get $p0) (local.get $p1)))
    (local.get $result)
  )
  (export "addNumbers" (func $addNumbers))

  ;; pure flow: multiplyNumbers
  (func $multiplyNumbers (param $p0 i32) (param $p1 i32) (result i32)
    (i32.mul (local.get $p0) (local.get $p1))
  )
  (export "multiplyNumbers" (func $multiplyNumbers))

)