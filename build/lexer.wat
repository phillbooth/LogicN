(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; pure flow: makeKeywordTable
  (func $makeKeywordTable (result i32)
    (i32.const 52) ;; list-literal: 52 items (heap allocation pending P9.3)
  )
  (export "makeKeywordTable" (func $makeKeywordTable))

  ;; pure flow: scanWord
  (func $scanWord (param $p0 i32) (param $p1 i32) (param $p2 i32) (result i32)
    (local $i i32)
    (local $word i32)
    (local $done i32)
    (local $opt i32)
    (local.set $i (local.get $p1))
    (local.set $word (i32.const 0) ;; string: "")
    (local.set $done (i32.const 0) ;; bool: false)
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.eqz (i32.and (i32.lt_s (local.get $i) (local.get $p2)) (i32.eq (local.get $done) (i32.const 0) ;; bool: false))))
        (local.set $opt (call $charAt (local.get $p0) (local.get $i)))
        (local.set $done (i32.const 1) ;; bool: true)
        (if (i32.eq (local.get $opt) (i32.const 1))
          (then
          )
        )
        (br $while_loop_0)
      )
    )
    (i32.const 2) ;; list-literal: 2 items (heap allocation pending P9.3)
  )
  (export "scanWord" (func $scanWord))

  ;; pure flow: scanOperator
  (func $scanOperator (param $p0 i32) (param $p1 i32) (param $p2 i32) (result i32)
    (local $optA i32)
    (local.set $optA (call $charAt (local.get $p0) (local.get $p1)))
    (return (i32.const 3) ;; list-literal: 3 items (heap allocation pending P9.3))
    (if (i32.eq (local.get $optA) (i32.const 1))
      (then
      )
    )
  )
  (export "scanOperator" (func $scanOperator))

  ;; pure flow: scanDigits
  (func $scanDigits (param $p0 i32) (param $p1 i32) (param $p2 i32) (result i32)
    (local $i i32)
    (local $digits i32)
    (local $done i32)
    (local $opt i32)
    (local.set $i (local.get $p1))
    (local.set $digits (i32.const 0) ;; string: "")
    (local.set $done (i32.const 0) ;; bool: false)
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.eqz (i32.and (i32.lt_s (local.get $i) (local.get $p2)) (i32.eq (local.get $done) (i32.const 0) ;; bool: false))))
        (local.set $opt (call $charAt (local.get $p0) (local.get $i)))
        (local.set $done (i32.const 1) ;; bool: true)
        (if (i32.eq (local.get $opt) (i32.const 1))
          (then
          )
        )
        (br $while_loop_0)
      )
    )
    (i32.const 2) ;; list-literal: 2 items (heap allocation pending P9.3)
  )
  (export "scanDigits" (func $scanDigits))

  ;; pure flow: scanString
  (func $scanString (param $p0 i32) (param $p1 i32) (param $p2 i32) (result i32)
    (local $i i32)
    (local $value i32)
    (local $done i32)
    (local $opt i32)
    (local.set $i (i32.add (local.get $p1) (i32.const 1)))
    (local.set $value (i32.const 0) ;; string: "")
    (local.set $done (i32.const 0) ;; bool: false)
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.eqz (i32.and (i32.lt_s (local.get $i) (local.get $p2)) (i32.eq (local.get $done) (i32.const 0) ;; bool: false))))
        (local.set $opt (call $charAt (local.get $p0) (local.get $i)))
        (local.set $done (i32.const 1) ;; bool: true)
        (if (i32.eq (local.get $opt) (i32.const 1))
          (then
          )
        )
        (br $while_loop_0)
      )
    )
    (i32.const 2) ;; list-literal: 2 items (heap allocation pending P9.3)
  )
  (export "scanString" (func $scanString))

  ;; pure flow: scanCharLit
  (func $scanCharLit (param $p0 i32) (param $p1 i32) (param $p2 i32) (result i32)
    (local $i i32)
    (local $value i32)
    (local $done i32)
    (local $opt i32)
    (local.set $i (i32.add (local.get $p1) (i32.const 1)))
    (local.set $value (i32.const 0) ;; string: "")
    (local.set $done (i32.const 0) ;; bool: false)
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.eqz (i32.and (i32.lt_s (local.get $i) (local.get $p2)) (i32.eq (local.get $done) (i32.const 0) ;; bool: false))))
        (local.set $opt (call $charAt (local.get $p0) (local.get $i)))
        (local.set $done (i32.const 1) ;; bool: true)
        (if (i32.eq (local.get $opt) (i32.const 1))
          (then
          )
        )
        (br $while_loop_0)
      )
    )
    (i32.const 2) ;; list-literal: 2 items (heap allocation pending P9.3)
  )
  (export "scanCharLit" (func $scanCharLit))

  ;; pure flow: scanLineComment
  (func $scanLineComment (param $p0 i32) (param $p1 i32) (param $p2 i32) (result i32)
    (local $i i32)
    (local $value i32)
    (local $done i32)
    (local $opt i32)
    (local.set $i (local.get $p1))
    (local.set $value (i32.const 0) ;; string: "")
    (local.set $done (i32.const 0) ;; bool: false)
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.eqz (i32.and (i32.lt_s (local.get $i) (local.get $p2)) (i32.eq (local.get $done) (i32.const 0) ;; bool: false))))
        (local.set $opt (call $charAt (local.get $p0) (local.get $i)))
        (local.set $done (i32.const 1) ;; bool: true)
        (if (i32.eq (local.get $opt) (i32.const 1))
          (then
          )
        )
        (br $while_loop_0)
      )
    )
    (i32.const 2) ;; list-literal: 2 items (heap allocation pending P9.3)
  )
  (export "scanLineComment" (func $scanLineComment))

  ;; pure flow: scanBlockComment
  (func $scanBlockComment (param $p0 i32) (param $p1 i32) (param $p2 i32) (result i32)
    (local $i i32)
    (local $value i32)
    (local $done i32)
    (local $opt i32)
    (local.set $i (i32.add (local.get $p1) (i32.const 2)))
    (local.set $value (i32.const 2) ;; string: "/*")
    (local.set $done (i32.const 0) ;; bool: false)
    (block $while_exit_0
      (loop $while_loop_0
        (br_if $while_exit_0 (i32.eqz (i32.and (i32.lt_s (local.get $i) (local.get $p2)) (i32.eq (local.get $done) (i32.const 0) ;; bool: false))))
        (local.set $opt (call $charAt (local.get $p0) (local.get $i)))
        (local.set $done (i32.const 1) ;; bool: true)
        (if (i32.eq (local.get $opt) (i32.const 1))
          (then
          )
        )
        (br $while_loop_0)
      )
    )
    (i32.const 2) ;; list-literal: 2 items (heap allocation pending P9.3)
  )
  (export "scanBlockComment" (func $scanBlockComment))

  ;; effectful flow: tokenize
  (func $tokenize (param $p0 i32) (result i32)
    unreachable
  )

)