// =============================================================================
// @logicn/devtools-pci — PCI DSS 4.0.1 Compliance Types
//
// Type definitions for PCI audit findings and reports.
// Schema version: lln.pci-audit.v1
// =============================================================================

/** The PCI DSS 4.0.1 requirement codes covered by static analysis. */
export type PciRequirement =
  | "3.3"
  | "3.5"
  | "4.2"
  | "6.2"
  | "6.3"
  | "7"
  | "8"
  | "10.2"
  | "10.3"
  | "12.6";

/** A single PCI compliance finding raised by static analysis. */
export interface PciFinding {
  readonly code: string;            // LLN-PCI-001..010
  readonly name: string;
  readonly pciRequirement: PciRequirement;
  readonly severity: "critical" | "high" | "medium";
  readonly message: string;
  readonly flowName?: string;
  readonly file?: string;
}

/** Full PCI compliance audit report for a single .lln source file. */
export interface PciAuditReport {
  readonly schemaVersion: "lln.pci-audit.v1";
  readonly pciDssVersion: "4.0.1";
  readonly source: string;
  readonly findings: readonly PciFinding[];
  readonly critical: readonly PciFinding[];
  readonly high: readonly PciFinding[];
  readonly requirementsCovered: PciRequirement[];
  readonly passedRequirements: PciRequirement[];
  readonly failedRequirements: PciRequirement[];
  readonly auditedAt: string;
  readonly passed: boolean;
}

/** All PCI requirement codes that this checker covers. */
export const ALL_PCI_REQUIREMENTS: readonly PciRequirement[] = [
  "3.3", "3.5", "4.2", "6.2", "6.3", "7", "8", "10.2", "10.3", "12.6",
] as const;
