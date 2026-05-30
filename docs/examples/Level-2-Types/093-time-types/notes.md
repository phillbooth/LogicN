# 093 — Time types

**Concept:** Duration, Timestamp, Duration arithmetic

## Duration

`Duration` represents a span of time. It is stored internally as milliseconds.

### Constructors

| Method | Description |
|--------|-------------|
| `Duration.ofMs(n)` | n milliseconds |
| `Duration.ofSeconds(n)` | n seconds |
| `Duration.ofMinutes(n)` | n minutes |
| `Duration.ofHours(n)` | n hours |

### Arithmetic

| Method | Description |
|--------|-------------|
| `d.add(other)` | Returns a new Duration with the two spans summed |
| `d.subtract(other)` | Returns a new Duration with the difference |
| `d.toString()` | Human-readable string (e.g. "30s", "1h30m") |

## Timestamp

`Timestamp` is a point in time (UTC). Obtain from `context.now` or service calls.
Subtract two Timestamps to get a Duration.

## Notes

- Duration values are immutable — `add` and `subtract` return new values.
- Use `Duration.ofSeconds(30)` for short timeouts; `Duration.ofMinutes(5)` for flow deadlines.
- See `contract.timeouts` for declaring deadline constraints.

**AI rule:** Duration is a time span — use Duration.ofMs, ofSeconds, ofMinutes, ofHours.
