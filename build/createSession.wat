(module
  (memory 2 2048)
  (export "memory" (memory 0))

  ;; effect: database.write
  (import "host" "db.insert" (func $host_db_insert (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: database.write
  (import "host" "db.update" (func $host_db_update (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: database.write
  (import "host" "db.delete" (func $host_db_delete (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: audit.write
  (import "host" "audit.write" (func $host_audit_write (param $p0 i32) (param $p1 i32) (result i32)))
  ;; effect: audit.write
  (import "host" "audit.log" (func $host_audit_log (param $p0 i32) (param $p1 i32) (result i32)))

  ;; effectful flow: createSession
  (func $createSession (param $p0 externref) (result i32)
    unreachable
  )

)