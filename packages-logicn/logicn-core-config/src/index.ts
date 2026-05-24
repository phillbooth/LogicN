export const ENVIRONMENT_MODES = [
  "development",
  "test",
  "staging",
  "production",
] as const;

export type EnvironmentMode = (typeof ENVIRONMENT_MODES)[number];

export type ConfigDiagnosticSeverity = "warning" | "error";

export interface ConfigDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: ConfigDiagnosticSeverity;
  readonly path?: string;
  readonly suggestedFix?: string;
}

export interface ProjectPackageReference {
  readonly path: string;
  readonly role?: string;
}

export interface ProductionPackageOverride {
  readonly path: string;
  readonly reason: string;
  readonly expires?: string;
}

export interface ConfigPathmatch {
  readonly [name: string]: string;
}

export interface ProjectConfig {
  readonly name: string;
  readonly version: string;
  readonly root: string;
  readonly entryFiles: readonly string[];
  readonly packages: readonly ProjectPackageReference[];
  readonly strict: boolean;
  readonly targets: readonly string[];
  readonly defaultPackage?: string;
  readonly productionPackageOverrides: readonly ProductionPackageOverride[];
  readonly docs?: ConfigPathMap;
  readonly tools?: ConfigPathMap;
}

export type EnvironmentVariableScope =
  | "build"
  | "deployment"
  | "runtime"
  | "test";

export interface EnvironmentVariableReference {
  readonly kind: "env";
  readonly name: string;
  readonly required: boolean;
  readonly secret: boolean;
  readonly scope: EnvironmentVariableScope;
  readonly defaultValue?: string;
  readonly description?: string;
}

export interface EnvironmentConfig {
  readonly mode: EnvironmentMode;
  readonly variables: readonly EnvironmentVariableReference[];
  readonly secrets: readonly EnvironmentVariableReference[];
}

export interface ProductionStrictnessPolicy {
  readonly requireStrictProject: boolean;
  readonly allowDefaultedSecrets: boolean;
  readonly allowMissingRequiredVariables: boolean;
  readonly requireRuntimeHandoffValidation: boolean;
  readonly disabledPackagePatterns: readonly string[];
  readonly allowProductionPackageOverrides: boolean;
  readonly maxWarnings: number;
}

export interface RuntimeConfigHandoff {
  readonly project: ProjectConfig;
  readonly environment: EnvironmentConfig;
  readonly productionPolicy: ProductionStrictnessPolicy;
  readonly activeProductionPackageOverrides: readonly ProductionPackageOverride[];
  readonly diagnostics: readonly ConfigDiagnostic[];
  readonly canRun: boolean;
  readonly generatedAt: string;
}

export interface ConfigLoadResult {
  readonly project?: ProjectConfig;
  readonly environment?: EnvironmentConfig;
  readonly productionPolicy?: ProductionStrictnessPolicy;
  readonly runtime?: RuntimeConfigHandoff;
  readonly diagnostics: readonly ConfigDiagnostic[];
}

export interface RuntimeConfigHandoffOptions {
  readonly generatedAt?: string;
  readonly availableEnvironment?: Readonly<Record<string, string | undefined>>;
  readonly diagnostics?: readonly ConfigDiagnostic[];
  readonly productionPolicy?: Partial<ProductionStrictnessPolicy>;
}

export interface HostPackageManifestBoundaryPolicy {
  readonly manifestPath: string;
  readonly forbiddenLoKeys: readonly string[];
  readonly dependencyFields: readonly string[];
}

const ENVIRONMENT_MODE_SET: ReadonlySet<string> = new Set(ENVIRONMENT_MODES);

const ENVIRONMENT_VARIABLE_SCOPES: readonly EnvironmentVariableScope[] = [
  "build",
  "deployment",
  "runtime",
  "test",
];

const ENVIRONMENT_VARIABLE_SCOPE_SET: ReadonlySet<string> = new Set(
  ENVIRONMENT_VARIABLE_SCOPES,
);

const ENVIRONMENT_VARIABLE_NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/;

export const DEFAULT_HOST_PACKAGE_MANIFEST_BOUNDARY_POLICY:
  HostPackageManifestBoundaryPolicy = {
    manifestPath: "package.json",
    forbiddenLoKeys: [
      "LogicN",
      "loPackages",
      "loDependencies",
      "loProfiles",
      "loTargets",
      "packageLo",
      "package-LogicN",
      "loLock",
      "LogicN.lock",
      "productionPackageOverrides",
    ],
    dependencyFields: [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ],
  };

export const DEFAULT_PRODUCTION_STRICTNESS_POLICY: ProductionStrictnessPolicy = {
  requireStrictProject: true,
  allowDefaultedSecrets: false,
  allowMissingRequiredVariables: false,
  requireRuntimeHandoffValidation: true,
  disabledPackagePatterns: [
    "packages-logicn/logicn-tools-benchmark",
    "packages-logicn/logicn-devtools-",
  ],
  allowProductionPackageOverrides: true,
  maxWarnings: 0,
};

export function isEnvironmentMode(value: string): value is EnvironmentMode {
  return ENVIRONMENT_MODE_SET.has(value);
}

export function createConfigDiagnostic(
  code: string,
  severity: ConfigDiagnosticSeverity,
  message: string,
  path?: string,
  suggestedFix?: string,
): ConfigDiagnostic {
  return {
    code,
    severity,
    message,
    ...(path === undefined ? {} : { path }),
    ...(suggestedFix === undefined ? {} : { suggestedFix }),
  };
}

export function resolveEnvironmentMode(
  value: unknown,
  fallback: EnvironmentMode = "development",
): Pick<EnvironmentConfig, "mode"> & {
  readonly diagnostics: readonly ConfigDiagnostic[];
} {
  if (typeof value === "string" && isEnvironmentMode(value)) {
    return { mode: value, diagnostics: [] };
  }

  if (typeof value === "string") {
    return {
      mode: fallback,
      diagnostics: [
        createConfigDiagnostic(
          "LogicN_CONFIG_INVALID_ENVIRONMENT_MODE",
          "error",
          `Unsupported environment mode "${value}".`,
          "environment.mode",
          `Use one of: ${ENVIRONMENT_MODES.join(", ")}.`,
        ),
      ],
    };
  }

  return {
    mode: fallback,
    diagnostics: [
      createConfigDiagnostic(
        "LogicN_CONFIG_MISSING_ENVIRONMENT_MODE",
        "warning",
        `Environment mode was not set; using "${fallback}".`,
        "environment.mode",
      ),
    ],
  };
}

export function defineProductionStrictnessPolicy(
  policy: Partial<ProductionStrictnessPolicy> = {},
): ProductionStrictnessPolicy {
  return {
    requireStrictProject:
      policy.requireStrictProject ??
      DEFAULT_PRODUCTION_STRICTNESS_POLICY.requireStrictProject,
    allowDefaultedSecrets:
      policy.allowDefaultedSecrets ??
      DEFAULT_PRODUCTION_STRICTNESS_POLICY.allowDefaultedSecrets,
    allowMissingRequiredVariables:
      policy.allowMissingRequiredVariables ??
      DEFAULT_PRODUCTION_STRICTNESS_POLICY.allowMissingRequiredVariables,
    requireRuntimeHandoffValidation:
      policy.requireRuntimeHandoffValidation ??
      DEFAULT_PRODUCTION_STRICTNESS_POLICY.requireRuntimeHandoffValidation,
    disabledPackagePatterns:
      policy.disabledPackagePatterns ??
      DEFAULT_PRODUCTION_STRICTNESS_POLICY.disabledPackagePatterns,
    allowProductionPackageOverrides:
      policy.allowProductionPackageOverrides ??
      DEFAULT_PRODUCTION_STRICTNESS_POLICY.allowProductionPackageOverrides,
    maxWarnings:
      policy.maxWarnings ?? DEFAULT_PRODUCTION_STRICTNESS_POLICY.maxWarnings,
  };
}

export function parseProjectConfig(
  input: unknown,
): Pick<ConfigLoadResult, "project" | "diagnostics"> {
  const diagnostics: ConfigDiagnostic[] = [];

  if (!isRecord(input)) {
    return {
      diagnostics: [
        createConfigDiagnostic(
          "LogicN_CONFIG_PROJECT_NOT_OBJECT",
          "error",
          "Project config must be an object.",
          "project",
        ),
      ],
    };
  }

  const name = readRequiredString(input, "name", diagnostics);
  const version = readRequiredString(input, "version", diagnostics);
  const root = readOptionalString(input, "root") ?? ".";
  const entryFiles = readStringArray(input, "entryFiles", diagnostics);
  const packages = readPackageReferences(input, "packages", diagnostics);
  const strict = readOptionalBoolean(input, "strict") ?? true;
  const targets = readStringArray(input, "targets", diagnostics);
  const defaultPackage = readOptionalString(input, "defaultPackage");
  const productionPackageOverrides = readProductionPackageOverrides(
    input["production"],
    "production.packageOverrides",
    diagnostics,
  );
  const docs = readStringMap(input, "docs", diagnostics);
  const tools = readStringMap(input, "tools", diagnostics);

  if (name === undefined || version === undefined) {
    return { diagnostics };
  }

  const project: ProjectConfig = {
    name,
    version,
    root,
    entryFiles,
    packages,
    strict,
    targets,
    productionPackageOverrides,
    ...(defaultPackage === undefined ? {} : { defaultPackage }),
    ...(docs === undefined ? {} : { docs }),
    ...(tools === undefined ? {} : { tools }),
  };

  return { project, diagnostics };
}

export function defineEnvironmentVariableReference(
  name: string,
  options: {
    readonly required?: boolean;
    readonly secret?: boolean;
    readonly scope?: EnvironmentVariableScope;
    readonly defaultValue?: string;
    readonly description?: string;
  } = {},
): EnvironmentVariableReference {
  return {
    kind: "env",
    name,
    required: options.required ?? true,
    secret: options.secret ?? false,
    scope: options.scope ?? "runtime",
    ...(options.defaultValue === undefined
      ? {}
      : { defaultValue: options.defaultValue }),
    ...(options.description === undefined
      ? {}
      : { description: options.description }),
  };
}

export function parseEnvironmentConfig(
  input: unknown,
): Pick<ConfigLoadResult, "environment" | "diagnostics"> {
  const diagnostics: ConfigDiagnostic[] = [];

  if (!isRecord(input)) {
    const modeResult = resolveEnvironmentMode(input);
    return {
      environment: { mode: modeResult.mode, variables: [], secrets: [] },
      diagnostics: modeResult.diagnostics,
    };
  }

  const modeResult = resolveEnvironmentMode(input["mode"]);
  diagnostics.push(...modeResult.diagnostics);

  const variableRefs = readEnvironmentVariableReferences(
    input["variables"],
    "environment.variables",
    false,
    diagnostics,
  );
  const secretRefs = readEnvironmentVariableReferences(
    input["secrets"],
    "environment.secrets",
    true,
    diagnostics,
  );

  return {
    environment: {
      mode: modeResult.mode,
      variables: variableRefs,
      secrets: secretRefs,
    },
    diagnostics,
  };
}

export function validateRuntimeEnvironment(
  environment: EnvironmentConfig,
  availableEnvironment: Readonly<Record<string, string | undefined>>,
  policy: ProductionStrictnessPolicy = DEFAULT_PRODUCTION_STRICTNESS_POLICY,
): readonly ConfigDiagnostic[] {
  const diagnostics: ConfigDiagnostic[] = [];
  const references = [...environment.variables, ...environment.secrets];

  for (const reference of references) {
    const value = availableEnvironment[reference.name];
    if (reference.required && (value === undefined || value === "")) {
      const severity =
        environment.mode === "production" &&
        !policy.allowMissingRequiredVariables
          ? "error"
          : "warning";
      diagnostics.push(
        createConfigDiagnostic(
          "LogicN_CONFIG_REQUIRED_ENVIRONMENT_VARIABLE_MISSING",
          severity,
          `Required environment variable "${reference.name}" is missing.`,
          `environment.${reference.secret ? "secrets" : "variables"}.${reference.name}`,
        ),
      );
    }
  }

  return diagnostics;
}

export function createRuntimeConfigHandoff(
  project: ProjectConfig,
  environment: EnvironmentConfig,
  options: RuntimeConfigHandoffOptions = {},
): RuntimeConfigHandoff {
  const productionPolicy = defineProductionStrictnessPolicy(
    options.productionPolicy,
  );
  const diagnostics: ConfigDiagnostic[] = [...(options.diagnostics ?? [])];

  diagnostics.push(
    ...validateProductionStrictness(project, environment, productionPolicy),
  );
  const activeProductionPackageOverrides =
    environment.mode === "production" ? project.productionPackageOverrides : [];

  if (
    environment.mode === "production" &&
    productionPolicy.requireRuntimeHandoffValidation &&
    options.availableEnvironment === undefined
  ) {
    diagnostics.push(
      createConfigDiagnostic(
        "LogicN_CONFIG_PRODUCTION_REQUIRES_ENVIRONMENT_VALIDATION",
        "error",
        "Production config handoff requires environment variable presence validation.",
        "environment",
      ),
    );
  }

  if (options.availableEnvironment !== undefined) {
    diagnostics.push(
      ...validateRuntimeEnvironment(
        environment,
        options.availableEnvironment,
        productionPolicy,
      ),
    );
  }

  const warningCount = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "warning",
  ).length;
  const hasError = diagnostics.some(
    (diagnostic) => diagnostic.severity === "error",
  );
  const warningsAllowed =
    environment.mode !== "production" ||
    warningCount <= productionPolicy.maxWarnings;

  return {
    project,
    environment,
    productionPolicy,
    activeProductionPackageOverrides,
    diagnostics,
    canRun: !hasError && warningsAllowed,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
  };
}

export function loadConfigFromObjects(input: {
  readonly project: unknown;
  readonly environment?: unknown;
  readonly availableEnvironment?: Readonly<Record<string, string | undefined>>;
  readonly productionPolicy?: Partial<ProductionStrictnessPolicy>;
  readonly generatedAt?: string;
}): ConfigLoadResult {
  const projectResult = parseProjectConfig(input.project);
  const environmentResult = parseEnvironmentConfig(input.environment);
  const diagnostics = [
    ...projectResult.diagnostics,
    ...environmentResult.diagnostics,
  ];

  const productionPolicy = defineProductionStrictnessPolicy(
    input.productionPolicy,
  );

  if (
    projectResult.project === undefined ||
    environmentResult.environment === undefined
  ) {
    return { productionPolicy, diagnostics };
  }

  const runtime = createRuntimeConfigHandoff(
    projectResult.project,
    environmentResult.environment,
    {
      diagnostics,
      productionPolicy,
      ...(input.availableEnvironment === undefined
        ? {}
        : { availableEnvironment: input.availableEnvironment }),
      ...(input.generatedAt === undefined
        ? {}
        : { generatedAt: input.generatedAt }),
    },
  );

  return {
    project: projectResult.project,
    environment: environmentResult.environment,
    productionPolicy,
    runtime,
    diagnostics: runtime.diagnostics,
  };
}

export function validateHostPackageManifestBoundary(
  input: unknown,
  policy: HostPackageManifestBoundaryPolicy =
    DEFAULT_HOST_PACKAGE_MANIFEST_BOUNDARY_POLICY,
): readonly ConfigDiagnostic[] {
  if (!isRecord(input)) {
    return [
      createConfigDiagnostic(
        "LogicN_CONFIG_HOST_PACKAGE_MANIFEST_NOT_OBJECT",
        "error",
        "Host package manifest must be an object.",
        policy.manifestPath,
      ),
    ];
  }

  const diagnostics: ConfigDiagnostic[] = [];

  for (const key of policy.forbiddenLoKeys) {
    if (Object.hasOwn(input, key)) {
      diagnostics.push(
        createConfigDiagnostic(
          "LogicN_CONFIG_LogicN_PACKAGE_GRAPH_IN_HOST_MANIFEST",
          "error",
          `Host package manifest must not define LogicN package graph key "${key}". Use package-logicn.json and LogicN.lock.json for LogicN packages.`,
          `${policy.manifestPath}.${key}`,
        ),
      );
    }
  }

  for (const field of policy.dependencyFields) {
    const dependencies = input[field];

    if (dependencies === undefined) {
      continue;
    }

    if (!isRecord(dependencies)) {
      diagnostics.push(
        createConfigDiagnostic(
          "LogicN_CONFIG_HOST_DEPENDENCIES_NOT_OBJECT",
          "error",
          `Host package manifest field "${field}" must be an object.`,
          `${policy.manifestPath}.${field}`,
        ),
      );
      continue;
    }

    for (const packageName of Object.keys(dependencies)) {
      if (isLoPackageGraphAlias(packageName)) {
        diagnostics.push(
          createConfigDiagnostic(
            "LogicN_CONFIG_LogicN_PACKAGE_ALIAS_IN_HOST_DEPENDENCIES",
            "error",
            `Host package dependency "${packageName}" looks like a LogicN package graph alias. Use package-logicn.json for LogicN package resolution.`,
            `${policy.manifestPath}.${field}.${packageName}`,
          ),
        );
      }
    }
  }

  return diagnostics;
}

function validateProductionStrictness(
  project: ProjectConfig,
  environment: EnvironmentConfig,
  policy: ProductionStrictnessPolicy,
): readonly ConfigDiagnostic[] {
  if (environment.mode !== "production") {
    return [];
  }

  const diagnostics: ConfigDiagnostic[] = [];

  if (policy.requireStrictProject && !project.strict) {
    diagnostics.push(
      createConfigDiagnostic(
        "LogicN_CONFIG_PRODUCTION_REQUIRES_STRICT_PROJECT",
        "error",
        "Production mode requires strict project configuration.",
        "project.strict",
      ),
    );
  }

  if (!policy.allowDefaultedSecrets) {
    for (const secret of environment.secrets) {
      if (secret.defaultValue !== undefined) {
        diagnostics.push(
          createConfigDiagnostic(
            "LogicN_CONFIG_SECRET_DEFAULT_NOT_ALLOWED",
            "error",
            `Secret environment variable "${secret.name}" must not define a default value.`,
            `environment.secrets.${secret.name}`,
          ),
        );
      }
    }
  }

  const overridePaths = new Set(
    project.productionPackageOverrides.map((override) => override.path),
  );

  for (const packageRef of project.packages) {
    const matchedPattern = policy.disabledPackagePatterns.find((pattern) =>
      packageRef.path.includes(pattern),
    );

    if (matchedPattern === undefined) {
      continue;
    }

    if (!overridePaths.has(packageRef.path)) {
      diagnostics.push(
        createConfigDiagnostic(
          "LogicN_CONFIG_PRODUCTION_PACKAGE_DISABLED",
          "error",
          `Production mode disables package "${packageRef.path}" by default.`,
          "project.packages",
          "Remove this package from the production profile or add an explicit production.packageOverrides entry with a reason.",
        ),
      );
      continue;
    }

    if (!policy.allowProductionPackageOverrides) {
      diagnostics.push(
        createConfigDiagnostic(
          "LogicN_CONFIG_PRODUCTION_PACKAGE_OVERRIDE_NOT_ALLOWED",
          "error",
          `Production package override is not allowed for "${packageRef.path}".`,
          "project.production.packageOverrides",
        ),
      );
    }
  }

  return diagnostics;
}

function readProductionPackageOverrides(
  input: unknown,
  path: string,
  diagnostics: ConfigDiagnostic[],
): readonly ProductionPackageOverride[] {
  if (input === undefined) {
    return [];
  }

  if (!isRecord(input)) {
    diagnostics.push(
      createConfigDiagnostic(
        "LogicN_CONFIG_PRODUCTION_POLICY_INVALID",
        "error",
        "Production package policy must be an object.",
        "production",
      ),
    );
    return [];
  }

  const overrides = input["packageOverrides"];
  if (overrides === undefined) {
    return [];
  }

  if (!Array.isArray(overrides)) {
    diagnostics.push(
      createConfigDiagnostic(
        "LogicN_CONFIG_PRODUCTION_PACKAGE_OVERRIDES_INVALID",
        "error",
        "Production package overrides must be an array.",
        path,
      ),
    );
    return [];
  }

  const parsedOverrides: ProductionPackageOverride[] = [];

  overrides.forEach((override, index) => {
    const overridePath = `${path}.${index}`;
    if (!isRecord(override)) {
      diagnostics.push(
        createConfigDiagnostic(
          "LogicN_CONFIG_PRODUCTION_PACKAGE_OVERRIDE_INVALID",
          "error",
          "Production package override must be an object.",
          overridePath,
        ),
      );
      return;
    }

    const packagePath = readRequiredString(
      override,
      "path",
      diagnostics,
      overridePath,
    );
    const reason = readRequiredString(
      override,
      "reason",
      diagnostics,
      overridePath,
    );
    const expires = readOptionalString(override, "expires");

    if (packagePath !== undefined && reason !== undefined) {
      parsedOverrides.push({
        path: packagePath,
        reason,
        ...(expires === undefined ? {} : { expires }),
      });
    }
  });

  return parsedOverrides;
}

function readEnvironmentVariableReferences(
  input: unknown,
  path: string,
  forceSecret: boolean,
  diagnostics: ConfigDiagnostic[],
): readonly EnvironmentVariableReference[] {
  if (input === undefined) {
    return [];
  }

  if (!Array.isArray(input)) {
    diagnostics.push(
      createConfigDiagnostic(
        "LogicN_CONFIG_ENVIRONMENT_REFERENCES_NOT_ARRAY",
        "error",
        "Environment variable references must be an array.",
        path,
      ),
    );
    return [];
  }

  const references: EnvironmentVariableReference[] = [];

  input.forEach((value, index) => {
    const referencePath = `${path}.${index}`;
    const reference = parseEnvironmentVariableReference(
      value,
      referencePath,
      forceSecret,
      diagnostics,
    );
    if (reference !== undefined) {
      references.push(reference);
    }
  });

  return references;
}

function parseEnvironmentVariableReference(
  input: unknown,
  path: string,
  forceSecret: boolean,
  diagnostics: ConfigDiagnostic[],
): EnvironmentVariableReference | undefined {
  if (typeof input === "string") {
    return checkedEnvironmentVariableReference(
      defineEnvironmentVariableReference(input, { secret: forceSecret }),
      path,
      diagnostics,
    );
  }

  if (!isRecord(input)) {
    diagnostics.push(
      createConfigDiagnostic(
        "LogicN_CONFIG_ENVIRONMENT_REFERENCE_INVALID",
        "error",
        "Environment variable reference must be a string or object.",
        path,
      ),
    );
    return undefined;
  }

  const name = readRequiredString(input, "name", diagnostics, path);
  if (name === undefined) {
    return undefined;
  }

  const scopeInput = input["scope"];
  const scope =
    typeof scopeInput === "string" &&
    ENVIRONMENT_VARIABLE_SCOPE_SET.has(scopeInput)
      ? (scopeInput as EnvironmentVariableScope)
      : "runtime";

  if (scopeInput !== undefined && scopeInput !== scope) {
    diagnostics.push(
      createConfigDiagnostic(
        "LogicN_CONFIG_ENVIRONMENT_REFERENCE_SCOPE_INVALID",
        "error",
        `Unsupported environment variable scope "${String(scopeInput)}".`,
        `${path}.scope`,
        `Use one of: ${ENVIRONMENT_VARIABLE_SCOPES.join(", ")}.`,
      ),
    );
  }

  const defaultValue = readOptionalString(input, "defaultValue");
  const description = readOptionalString(input, "description");

  return checkedEnvironmentVariableReference(
    defineEnvironmentVariableReference(name, {
      required: readOptionalBoolean(input, "required") ?? true,
      secret: forceSecret || (readOptionalBoolean(input, "secret") ?? false),
      scope,
      ...(defaultValue === undefined ? {} : { defaultValue }),
      ...(description === undefined ? {} : { description }),
    }),
    path,
    diagnostics,
  );
}

function checkedEnvironmentVariableReference(
  reference: EnvironmentVariableReference,
  path: string,
  diagnostics: ConfigDiagnostic[],
): EnvironmentVariableReference | undefined {
  if (!ENVIRONMENT_VARIABLE_NAME_PATTERN.test(reference.name)) {
    diagnostics.push(
      createConfigDiagnostic(
        "LogicN_CONFIG_ENVIRONMENT_REFERENCE_NAME_INVALID",
        "error",
        `Environment variable "${reference.name}" must be uppercase snake case.`,
        `${path}.name`,
      ),
    );
    return undefined;
  }

  return reference;
}

function readRequiredString(
  input: Readonly<Record<string, unknown>>,
  key: string,
  diagnostics: ConfigDiagnostic[],
  pathPrefix?: string,
): string | undefined {
  const value = input[key];
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  diagnostics.push(
    createConfigDiagnostic(
      "LogicN_CONFIG_REQUIRED_STRING_MISSING",
      "error",
      `Required string "${key}" is missing.`,
      pathPrefix === undefined ? key : `${pathPrefix}.${key}`,
    ),
  );
  return undefined;
}

function readOptionalString(
  input: Readonly<Record<string, unknown>>,
  key: string,
): string | undefined {
  const value = input[key];
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function readOptionalBoolean(
  input: Readonly<Record<string, unknown>>,
  key: string,
): boolean | undefined {
  const value = input[key];
  return typeof value === "boolean" ? value : undefined;
}

function readStringArray(
  input: Readonly<Record<string, unknown>>,
  key: string,
  diagnostics: ConfigDiagnostic[],
): readonly string[] {
  const value = input[key];

  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    diagnostics.push(
      createConfigDiagnostic(
        "LogicN_CONFIG_STRING_ARRAY_INVALID",
        "error",
        `"${key}" must be an array of strings.`,
        key,
      ),
    );
    return [];
  }

  const strings = value.filter(
    (item): item is string => typeof item === "string",
  );
  if (strings.length !== value.length) {
    diagnostics.push(
      createConfigDiagnostic(
        "LogicN_CONFIG_STRING_ARRAY_ITEM_INVALID",
        "error",
        `"${key}" contains a non-string value.`,
        key,
      ),
    );
  }

  return strings;
}

function readPackageReferences(
  input: Readonly<Record<string, unknown>>,
  key: string,
  diagnostics: ConfigDiagnostic[],
): readonly ProjectPackageReference[] {
  const value = input[key];

  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    diagnostics.push(
      createConfigDiagnostic(
        "LogicN_CONFIG_PACKAGE_REFERENCES_INVALID",
        "error",
        `"${key}" must be an array of package references.`,
        key,
      ),
    );
    return [];
  }

  const references: ProjectPackageReference[] = [];

  value.forEach((item, index) => {
    if (typeof item === "string") {
      references.push({ path: item });
      return;
    }

    if (isRecord(item)) {
      const path = readRequiredString(
        item,
        "path",
        diagnostics,
        `${key}.${index}`,
      );
      const role = readOptionalString(item, "role");
      if (path !== undefined) {
        references.push({
          path,
          ...(role === undefined ? {} : { role }),
        });
      }
      return;
    }

    diagnostics.push(
      createConfigDiagnostic(
        "LogicN_CONFIG_PACKAGE_REFERENCE_INVALID",
        "error",
        "Package reference must be a string or object.",
        `${key}.${index}`,
      ),
    );
  });

  return references;
}

function readStringMap(
  input: Readonly<Record<string, unknown>>,
  key: string,
  diagnostics: ConfigDiagnostic[],
): ConfigPathMap | undefined {
  const value = input[key];

  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    diagnostics.push(
      createConfigDiagnostic(
        "LogicN_CONFIG_STRING_MAP_INVALID",
        "error",
        `"${key}" must be an object whose values are strings.`,
        key,
      ),
    );
    return undefined;
  }

  const entries: Record<string, string> = {};

  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (typeof entryValue === "string") {
      entries[entryKey] = entryValue;
      continue;
    }

    diagnostics.push(
      createConfigDiagnostic(
        "LogicN_CONFIG_STRING_MAP_VALUE_INVALID",
        "error",
        `"${key}.${entryKey}" must be a string.`,
        `${key}.${entryKey}`,
      ),
    );
  }

  return entries;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLoPackageGraphAlias(packageName: string): boolean {
  return /^(?:package-LogicN|LogicN\.lock|LogicN-profile|LogicN-package-graph)$/i.test(
    packageName,
  );
}
