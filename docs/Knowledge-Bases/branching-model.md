# Branching Model

## Core Rule

```text
if  = simple decision (true/false)
map = match and transform
else = fallback
```

## if

Use `if` for simple true/false conditions:

```logicn
if user.is_active {
  allow()
}
else {
  deny()
}
```

## map

Use `map(value)` for comparing one value against multiple outcomes.

### Value Matching

```logicn
let payment_message: Text = map(payment.status) {
  Paid    => "Payment complete"
  Failed  => "Payment failed"
  Pending => "Waiting for payment"
}
else {
  "Unknown payment status"
}
```

Standard syntax:

```logicn
map(value_to_check) {
  possible_value => result
}
else {
  fallback_result
}
```

### Range Matching

```logicn
let grade = map(score) {
  >= 90 => "excellent"
  >= 70 => "good"
  >= 50 => "pass"
}
else {
  "fail"
}
```

### Object Pattern Matching

```logicn
let output: Text = map(request) {
  { method: "GET", path: "/users" }  => get_users()
  { method: "POST", path: "/users" } => create_user()
}
else {
  not_found()
}
```

## map Replaces switch and case

LogicN does not use `switch` or `case`. `map` provides the same behaviour
with a smaller, cleaner syntax:

```logicn
map(status) {
  "paid"    => complete()
  "failed"  => retry()
  "pending" => wait()
}
else {
  unknown()
}
```

## No elseif

`elseif` is not used. For multiple branches, use `map`:

```logicn
let result: Text = map(status) {
  "paid"   => "complete"
  "failed" => "failed"
}
else {
  "unknown"
}
```

## Final Language Rule

```text
if      = simple yes/no decision
else    = fallback branch
map     = multiple branch matching and transformation
elseif  = not required
switch  = not required
case    = not required as a standalone keyword
```
