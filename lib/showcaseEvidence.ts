/**
 * Evidence required before a cached Showcase prototype may be promoted.
 *
 * Keep this module dependency-free: the standalone promotion-gate smoke
 * transpiles and executes it directly in CI.
 */

export const SHOWCASE_EVIDENCE_SCHEMA_VERSION = 1 as const;

export const SHOWCASE_SCORE_KEYS = [
  "identity",
  "motion",
  "artifacts",
  "composition",
  "commercialUse",
] as const;

export type ShowcaseScoreKey = (typeof SHOWCASE_SCORE_KEYS)[number];

export type ShowcaseScores = Record<ShowcaseScoreKey, number>;

export type EvidenceJson =
  | string
  | number
  | boolean
  | null
  | EvidenceJson[]
  | { [key: string]: EvidenceJson };

export type ShowcaseEvidence = {
  schemaVersion: typeof SHOWCASE_EVIDENCE_SCHEMA_VERSION;
  rights: {
    basis: "owned" | "licensed";
    rightsRecordId: string;
    holder: string;
  };
  source: {
    sourceRecordId: string;
    inputAssetId: string;
    inputAssetPath: string;
    inputSha256: string;
    distinctFromOutputPoster: true;
  };
  provider: {
    name: string;
    taskId: string;
    requestId: string;
    model: string;
    parameters: Record<string, EvidenceJson>;
  };
  output: {
    outputAssetId: string;
    videoPath: string;
    posterPath: string;
    outputSha256: string;
  };
  review: {
    reviewer: {
      id: string;
      displayName: string;
    };
    reviewedAt: string;
    scores: ShowcaseScores;
    notes?: string;
  };
};

export type ShowcaseEvidenceValidation = {
  valid: boolean;
  missing: string[];
  errors: string[];
};

export type ShowcaseEvidenceChecklistItem = {
  id:
    | "rights"
    | "input"
    | "provider"
    | "parameters"
    | "output"
    | "reviewer"
    | "scores";
  label: string;
  complete: boolean;
};

const SHA256 = /^[a-f0-9]{64}$/i;

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDateTime(value: unknown): value is string {
  return (
    hasText(value) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value
    ) &&
    Number.isFinite(Date.parse(value))
  );
}

function isEvidenceJson(value: unknown): value is EvidenceJson {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isEvidenceJson);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isEvidenceJson);
  }
  return false;
}

function hasCompleteScores(scores: unknown): scores is ShowcaseScores {
  if (!scores || typeof scores !== "object") return false;
  const values = scores as Record<string, unknown>;
  return SHOWCASE_SCORE_KEYS.every(
    (key) =>
      typeof values[key] === "number" &&
      Number.isFinite(values[key]) &&
      Number(values[key]) >= 4 &&
      Number(values[key]) <= 5
  );
}

export function validateShowcaseEvidence(
  evidence: ShowcaseEvidence | null | undefined
): ShowcaseEvidenceValidation {
  const missing: string[] = [];
  const errors: string[] = [];

  if (!evidence) {
    return {
      valid: false,
      missing: ["evidence"],
      errors,
    };
  }

  if (evidence.schemaVersion !== SHOWCASE_EVIDENCE_SCHEMA_VERSION) {
    errors.push("schemaVersion must be 1");
  }

  if (!hasText(evidence.rights?.rightsRecordId)) {
    missing.push("rights.rightsRecordId");
  }
  if (!hasText(evidence.rights?.holder)) missing.push("rights.holder");
  if (
    evidence.rights?.basis !== "owned" &&
    evidence.rights?.basis !== "licensed"
  ) {
    errors.push("rights.basis must be owned or licensed");
  }

  if (!hasText(evidence.source?.sourceRecordId)) {
    missing.push("source.sourceRecordId");
  }
  if (!hasText(evidence.source?.inputAssetId)) {
    missing.push("source.inputAssetId");
  }
  if (!hasText(evidence.source?.inputAssetPath)) {
    missing.push("source.inputAssetPath");
  }
  if (!hasText(evidence.source?.inputSha256)) {
    missing.push("source.inputSha256");
  } else if (!SHA256.test(evidence.source.inputSha256)) {
    errors.push("source.inputSha256 must be a SHA-256 hex digest");
  }
  if (evidence.source?.distinctFromOutputPoster !== true) {
    errors.push("source.distinctFromOutputPoster must be true");
  }

  if (!hasText(evidence.provider?.name)) missing.push("provider.name");
  if (!hasText(evidence.provider?.taskId)) missing.push("provider.taskId");
  if (!hasText(evidence.provider?.requestId)) {
    missing.push("provider.requestId");
  }
  if (!hasText(evidence.provider?.model)) missing.push("provider.model");
  const parameters = evidence.provider?.parameters;
  if (
    !parameters ||
    typeof parameters !== "object" ||
    Array.isArray(parameters) ||
    Object.keys(parameters).length === 0
  ) {
    missing.push("provider.parameters");
  } else if (!isEvidenceJson(parameters)) {
    errors.push("provider.parameters must contain JSON-safe values");
  }

  if (!hasText(evidence.output?.outputAssetId)) {
    missing.push("output.outputAssetId");
  }
  if (!hasText(evidence.output?.videoPath)) missing.push("output.videoPath");
  if (!hasText(evidence.output?.posterPath)) missing.push("output.posterPath");
  if (!hasText(evidence.output?.outputSha256)) {
    missing.push("output.outputSha256");
  } else if (!SHA256.test(evidence.output.outputSha256)) {
    errors.push("output.outputSha256 must be a SHA-256 hex digest");
  }

  if (
    hasText(evidence.source?.inputAssetPath) &&
    hasText(evidence.output?.posterPath) &&
    evidence.source.inputAssetPath === evidence.output.posterPath
  ) {
    errors.push("source input asset must be distinct from the output poster");
  }
  if (
    hasText(evidence.source?.inputAssetPath) &&
    hasText(evidence.output?.videoPath) &&
    evidence.source.inputAssetPath === evidence.output.videoPath
  ) {
    errors.push("source input asset must be distinct from the output video");
  }

  if (!hasText(evidence.review?.reviewer?.id)) {
    missing.push("review.reviewer.id");
  }
  if (!hasText(evidence.review?.reviewer?.displayName)) {
    missing.push("review.reviewer.displayName");
  }
  if (!hasText(evidence.review?.reviewedAt)) {
    missing.push("review.reviewedAt");
  } else if (!isIsoDateTime(evidence.review.reviewedAt)) {
    errors.push("review.reviewedAt must be an ISO 8601 datetime with timezone");
  }
  if (!evidence.review?.scores) {
    missing.push("review.scores");
  } else if (!hasCompleteScores(evidence.review.scores)) {
    errors.push("all five review scores must be between 4 and 5");
  }

  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors,
  };
}

export function assertShowcaseEvidence(
  evidence: ShowcaseEvidence | null | undefined,
  context = "showcase project"
): asserts evidence is ShowcaseEvidence {
  const result = validateShowcaseEvidence(evidence);
  if (result.valid) return;
  const details = [...result.missing, ...result.errors].join("; ");
  throw new Error(`${context} cannot be promoted: ${details}`);
}

export function isPromotedShowcaseProvenance(provenance: string): boolean {
  return [
    "official",
    "official_verified",
    "live",
    "live_generated",
  ].includes(provenance);
}

export function assertShowcasePromotionGate(project: {
  slug: string;
  provenance: string;
  evidence?: ShowcaseEvidence;
  referencePoster?: string;
  outputVideo?: string;
  poster?: string;
  qualityScores?: unknown;
  reviewerNotes?: unknown;
}): void {
  if (project.qualityScores !== undefined || project.reviewerNotes !== undefined) {
    throw new Error(
      `${project.slug} uses legacy public score fields; keep review data inside evidence`
    );
  }
  if (isPromotedShowcaseProvenance(project.provenance)) {
    assertShowcaseEvidence(project.evidence, project.slug);
    if (
      project.referencePoster !== project.evidence.source.inputAssetPath ||
      project.outputVideo !== project.evidence.output.videoPath ||
      project.poster !== project.evidence.output.posterPath
    ) {
      throw new Error(
        `${project.slug} cannot be promoted: registered source/output assets do not match the evidence record`
      );
    }
  }
}

export function evidenceGatedProvenanceLabel(project: {
  slug: string;
  provenance: string;
  evidence?: ShowcaseEvidence;
  referencePoster?: string;
  outputVideo?: string;
  poster?: string;
}): string {
  assertShowcasePromotionGate(project);
  if (project.provenance === "official_verified") {
    return "Verified official example";
  }
  if (project.provenance === "live_generated") {
    return "Verified live generation";
  }
  if (project.provenance === "concept") return "Concept recipe";
  return "PIKBO Lab · cached prototype";
}

export function showcaseEvidenceChecklist(
  evidence: ShowcaseEvidence | null | undefined
): ShowcaseEvidenceChecklistItem[] {
  const rights =
    hasText(evidence?.rights?.rightsRecordId) &&
    hasText(evidence?.rights?.holder) &&
    (evidence?.rights?.basis === "owned" ||
      evidence?.rights?.basis === "licensed");
  const input =
    hasText(evidence?.source?.sourceRecordId) &&
    hasText(evidence?.source?.inputAssetId) &&
    hasText(evidence?.source?.inputAssetPath) &&
    hasText(evidence?.source?.inputSha256) &&
    SHA256.test(evidence.source.inputSha256) &&
    evidence.source.distinctFromOutputPoster === true &&
    evidence.source.inputAssetPath !== evidence?.output?.posterPath;
  const provider =
    hasText(evidence?.provider?.name) &&
    hasText(evidence?.provider?.taskId) &&
    hasText(evidence?.provider?.requestId) &&
    hasText(evidence?.provider?.model);
  const parameters =
    Boolean(evidence?.provider?.parameters) &&
    Object.keys(evidence?.provider?.parameters ?? {}).length > 0 &&
    isEvidenceJson(evidence?.provider?.parameters);
  const output =
    hasText(evidence?.output?.outputAssetId) &&
    hasText(evidence?.output?.videoPath) &&
    hasText(evidence?.output?.posterPath) &&
    hasText(evidence?.output?.outputSha256) &&
    SHA256.test(evidence.output.outputSha256);
  const reviewer =
    hasText(evidence?.review?.reviewer?.id) &&
    hasText(evidence?.review?.reviewer?.displayName) &&
    isIsoDateTime(evidence?.review?.reviewedAt);

  return [
    { id: "rights", label: "Rights record", complete: rights },
    { id: "input", label: "Distinct source asset", complete: input },
    { id: "provider", label: "Provider run IDs", complete: provider },
    { id: "parameters", label: "Model parameters", complete: parameters },
    { id: "output", label: "Output asset record", complete: output },
    { id: "reviewer", label: "Named review", complete: reviewer },
    {
      id: "scores",
      label: "Five-dimension pass",
      complete: hasCompleteScores(evidence?.review?.scores),
    },
  ];
}
