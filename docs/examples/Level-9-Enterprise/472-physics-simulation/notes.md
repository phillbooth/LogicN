# 472 — Physics simulation

**Concept:** Scientific domain flows with Mass, Force, Energy record types

Scientific and engineering simulation code is an ideal use case for `pure` flows:
the computations are deterministic, have no side effects, and should be
composable and testable in isolation.

## Domain record types

| Record | Fields | Unit |
|--------|--------|------|
| `Mass` | value, unit | kg |
| `Velocity` | value, unit | m/s |
| `Force` | value, unit | N |
| `Energy` | value, unit | J |

Records group a physical quantity with its unit string, making the type
self-documenting and preventing unit-mismatch bugs at the call site.

## Core formulae

| Flow | Formula |
|------|---------|
| `calculateKineticEnergy` | KE = 0.5 * m * v^2 |
| `calculateForce` | F = m * a |
| `calculateWork` | W = F * d |
| `calculatePower` | P = W / t |
| `simulationStep` | Composes KE + W into an Energy record |

## Why Decimal

`Decimal` preserves arbitrary precision, avoiding the floating-point rounding
that would accumulate over many simulation steps. Use `Decimal("0.5")` for
literal constants.

## Composability

`simulationStep` calls `calculateKineticEnergy` and `calculateWork` directly.
Pure flows can freely call other pure flows — there is no effect propagation to worry about.

## When to add a contract

If this simulation is exposed as a governed API (e.g. a web endpoint accepting
mass and velocity as request parameters), wrap it in a `guarded` or `secure` flow
with a contract. The pure helper flows remain unchanged.

**AI rule:** Scientific simulation flows are pure — no effects. Use Decimal for physical quantities.
