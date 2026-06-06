// precision-types.ts — the precision/scheduling/op-class vocabulary shared by the
// Brain (router) and the Brawn (bridges). These are the canonical TYPES; the
// routing LOGIC (sensitivity tables, routePrecision) stays in the Tower.

/** Number format a routed operation runs in. */
export type PrecisionTechnique =
  | "ternary"    // BitNet b1.58 {-1,0,+1}
  | "fp4_block"  // NVFP4 E2M1 block-scaled
  | "fp8"        // intermediate fallback
  | "fp16";      // full precision (sensitivity-critical layers)

/** How execution is ordered in time. */
export type SchedulingTechnique =
  | "dynamic"               // standard runtime dispatch
  | "deterministic_static"; // Groq-style pre-scheduled, zero jitter

/** Which part of an inference pass an operation belongs to. */
export type InferenceOpClass =
  | "embedding"
  | "attention"
  | "feedforward"
  | "normalization"
  | "output_head"
  | "kv_cache";
