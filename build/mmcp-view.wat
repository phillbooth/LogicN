(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; effectful flow: accessSecretData
  (func $accessSecretData (param $p0 externref) (result i32)
    unreachable
  )

  ;; pure flow: readOnlyData
  (func $readOnlyData (param $p0 externref) (result i32)
    (local $readView i32)
    (local.set $readView (local.get $p0))
    (local.get $readView)
  )
  (export "readOnlyData" (func $readOnlyData))

)