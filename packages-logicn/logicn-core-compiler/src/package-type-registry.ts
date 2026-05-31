// =============================================================================
// LogicN Phase R3 — Package Type Registry
//
// Provides a static map of known @logicn/* package names to the type names
// they export. Used by the symbol resolver and type checker to suppress
// LLN-TYPE-001 for types imported from known packages.
//
// This registry is the source of truth for cross-module type injection.
// When an `import X from "@logicn/foo"` statement is encountered, all types
// listed for that package are pre-registered so no unknown-type diagnostic
// fires for them.
// =============================================================================

export const KNOWN_PACKAGE_TYPES: ReadonlyMap<string, readonly string[]> = new Map([
  ["@logicn/healthcare-types", ["Email", "PatientId", "DOB", "PhoneNumber", "MedicalRecordId", "DiagnosisCode", "ProcedureCode", "ProviderNpi"]],
  ["@logicn/financial-types", ["Amount", "CurrencyCode", "AccountId", "TransactionId", "PaymentMethodId", "InvoiceId", "ReceiptId"]],
  ["@logicn/auth-types", ["UserId", "SessionId", "AuthToken", "RefreshToken", "PermissionId", "RoleId"]],
  ["@logicn/common-types", ["Url", "IpAddress", "Hostname", "Port", "TraceId", "CorrelationId"]],
  ["@logicn/ai-types", ["ModelId", "PromptId", "EmbeddingId", "InferenceResult", "ClassificationLabel"]],
  // Phase R3: expanded domain type packages
  ["@logicn/order-types", ["OrderId", "OrderStatus", "LineItem", "OrderTotal", "ShippingAddress", "DeliveryEstimate"]],
  ["@logicn/patient-types", ["PatientId", "MedicalRecord", "Diagnosis", "Prescription", "LabResult", "ConsentRecord"]],
  ["@logicn/notification-types", ["NotificationId", "NotificationChannel", "NotificationPayload", "DeliveryStatus"]],
  ["@logicn/identity-types", ["IdentityId", "VerificationCode", "BiometricHash", "DeviceFingerprint"]],
  ["@logicn/document-types", ["DocumentId", "DocumentType", "DocumentStatus", "Signature", "Timestamp"]],
  ["@logicn/webhook-types", ["WebhookId", "WebhookEvent", "WebhookPayload", "DeliveryAttempt"]],
]);

// ---------------------------------------------------------------------------
// Phase R3: Known domain types
//
// Commonly used domain type names that are valid even without an explicit
// import declaration. Level 5+ CEC examples often use these types directly
// without a full package import. Any type in this set will not trigger
// LLN-TYPE-001 even when it is absent from BUILT_IN_TYPES and no import
// statement was present.
// ---------------------------------------------------------------------------

export const KNOWN_DOMAIN_TYPES: ReadonlySet<string> = new Set([
  "Email", "PatientId", "UserId", "OrderId", "ProductId", "CustomerId",
  "SessionId", "AuthToken", "PaymentMethodId", "InvoiceId", "WebhookId",
  "WebhookEvent", "PhoneNumber", "Diagnosis", "MedicalRecord", "LabResult",
  "ConsentRecord",
]);

/**
 * Returns the list of type names exported by the given package.
 *
 * If the package is not in KNOWN_PACKAGE_TYPES, an empty array is returned.
 * These type names should be seeded into the type checker and symbol resolver
 * so that importing them does not produce LLN-TYPE-001 diagnostics.
 */
export function resolveImportedTypes(packageName: string): readonly string[] {
  return KNOWN_PACKAGE_TYPES.get(packageName) ?? [];
}

/**
 * Phase R3: Load type names for a package.
 *
 * Resolution order:
 *   1. KNOWN_PACKAGE_TYPES (fastest, static registry)
 *   2. package.logicn.yaml from node_modules (Phase 11E; stub returns [] here)
 *
 * @param packageName   The npm/package name, e.g. "@logicn/order-types".
 * @param _projectRoot  Optional project root path (used in Phase 11E for manifest lookup).
 * @returns             The type names exported by this package, or [] if unknown.
 */
export function loadManifestTypes(packageName: string, _projectRoot?: string): readonly string[] {
  // 1. Check KNOWN_PACKAGE_TYPES first (fastest path)
  const known = KNOWN_PACKAGE_TYPES.get(packageName);
  if (known !== undefined) return known;
  // 2. Try to load from node_modules/{packageName}/package.logicn.yaml
  // Phase R3: stub — returns [] if not found locally
  // Full implementation: Phase 11E loads from filesystem
  return [];
}
