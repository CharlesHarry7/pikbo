const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

export const validOfficialEvidence = {
  schemaVersion: 1,
  rights: {
    basis: "owned",
    rightsRecordId: "rights_internal_case_001",
    holder: "PIKBO Lab",
  },
  source: {
    sourceRecordId: "source_internal_case_001",
    inputAssetId: "asset_input_case_001",
    inputAssetPath: "/evidence/case-001/input.webp",
    inputSha256: HASH_A,
    distinctFromOutputPoster: true,
  },
  provider: {
    name: "test-provider",
    taskId: "provider_task_case_001",
    requestId: "provider_request_case_001",
    model: "test/image-to-video-v1",
    parameters: {
      durationSeconds: 5,
      aspectRatio: "9:16",
      seed: 1287,
    },
  },
  output: {
    outputAssetId: "asset_output_case_001",
    videoPath: "/evidence/case-001/output.mp4",
    posterPath: "/evidence/case-001/poster.webp",
    outputSha256: HASH_B,
  },
  review: {
    reviewer: {
      id: "reviewer_internal_001",
      displayName: "Internal QA Reviewer",
    },
    reviewedAt: "2026-07-27T14:30:00Z",
    scores: {
      identity: 4.5,
      motion: 4,
      artifacts: 4,
      composition: 4.5,
      commercialUse: 4,
    },
    notes: "Fixture only. It is not registered as a public project.",
  },
};

function invalidFixture(name, mutate) {
  const evidence = structuredClone(validOfficialEvidence);
  mutate(evidence);
  return { name, evidence };
}

export const invalidOfficialEvidenceFixtures = [
  invalidFixture("missing rights record", (evidence) => {
    evidence.rights.rightsRecordId = "";
  }),
  invalidFixture("input reuses output poster", (evidence) => {
    evidence.source.inputAssetPath = evidence.output.posterPath;
    evidence.source.distinctFromOutputPoster = false;
  }),
  invalidFixture("missing provider task id", (evidence) => {
    evidence.provider.taskId = "";
  }),
  invalidFixture("missing provider parameters", (evidence) => {
    evidence.provider.parameters = {};
  }),
  invalidFixture("missing output digest", (evidence) => {
    evidence.output.outputSha256 = "";
  }),
  invalidFixture("missing reviewer identity", (evidence) => {
    evidence.review.reviewer.id = "";
  }),
  invalidFixture("review timestamp has no timezone", (evidence) => {
    evidence.review.reviewedAt = "2026-07-27T14:30:00";
  }),
  invalidFixture("one quality dimension is below pass", (evidence) => {
    evidence.review.scores.identity = 3;
  }),
];
