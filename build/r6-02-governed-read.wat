(module
  ;; effect: database.read
  (import "host" "db.find" (func $host_db_find (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: database.read
  (import "host" "db.get" (func $host_db_get (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: database.read
  (import "host" "db.query" (func $host_db_query (param $p0 i32) (param $p1 i32) (result i32)))

  (memory 2 2048)
  (export "memory" (memory 0))

  ;; effectful flow: fetchRecord
  (func $fetchRecord (param $p0 i32) (result i32)
    unreachable
  )

)