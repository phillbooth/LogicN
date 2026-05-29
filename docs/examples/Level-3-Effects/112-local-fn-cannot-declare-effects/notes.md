# 112 — Local fn cannot declare effects

**Concept:** Local n cannot declare its own effects

Only low declarations can carry with effects [...]. A local n trying to declare its own effects is a security boundary violation — effect authority must be declared at the flow level.

**AI rule:** Only flow declarations may declare effects. Local n cannot have with effects [...].
