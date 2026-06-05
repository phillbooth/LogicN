(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; effect: stdlib.array
  (import "host" "__array_create" (func $host___array_create (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_append" (func $host___array_append (param $p0 i32) (param $p1 i32)))
  ;; effect: stdlib.array
  (import "host" "__array_get" (func $host___array_get (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_length" (func $host___array_length (param $p0 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_contains" (func $host___array_contains (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_first" (func $host___array_first (param $p0 i32) (result i32)))
  ;; effect: stdlib.array
  (import "host" "__array_last" (func $host___array_last (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_concat" (func $host___str_concat (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_length" (func $host___str_length (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_char_at" (func $host___str_char_at (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_to_int" (func $host___str_to_int (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__int_to_str" (func $host___int_to_str (param $p0 i32) (result i32)))
  ;; effect: stdlib.string
  (import "host" "__str_eq" (func $host___str_eq (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.char
  (import "host" "__char_is_letter" (func $host___char_is_letter (param $p0 i32) (result i32)))
  ;; effect: stdlib.char
  (import "host" "__char_is_digit" (func $host___char_is_digit (param $p0 i32) (result i32)))
  ;; effect: stdlib.char
  (import "host" "__char_to_string" (func $host___char_to_string (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__unwrap_or" (func $host___unwrap_or (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_some" (func $host___option_some (param $p0 i32) (result i32)))
  ;; effect: stdlib.result
  (import "host" "__option_none" (func $host___option_none (result i32)))

  ;; P9.3: temporary array ID register for listLiteral WAT emission
  (global $__lln_tmp_arr (mut i32) (i32.const 0))

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