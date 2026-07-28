/**
 * One durable T6 worker iteration. Scheduling is intentionally external.
 * The claim is service-role-only; no browser may supply the source URL.
 */

import {
  claimDurableT6Derivative,
  finishDurableT6Derivative,
  type DurableT6Claim,
} from "@/lib/durableCredits/t6Derivatives";
import {
  runT6PipelineWithInjectedRunner,
  type ServerOwnedT6Input,
  type T6InjectedRunner,
} from "@/lib/t6Worker";

export async function processClaimedT6Derivative(input: {
  workerId: string;
  claim: DurableT6Claim;
  runner: T6InjectedRunner;
  finish?: typeof finishDurableT6Derivative;
}) {
  const job: ServerOwnedT6Input = {
    jobId: input.claim.jobId,
    providerRequestId: input.claim.providerRequestId,
    provider: "server-owned-generation-output",
    providerOutputUrl: input.claim.sourceRef,
    idempotencyKey: input.claim.idempotencyKey,
  };
  const result = await runT6PipelineWithInjectedRunner({
    job,
    runner: input.runner,
  });
  const finish = input.finish || finishDurableT6Derivative;
  return finish({
    workerId: input.workerId,
    leaseToken: input.claim.leaseToken,
    jobId: input.claim.jobId,
    result,
  });
}

export async function processOneDurableT6Derivative(input: {
  workerId: string;
  runner: T6InjectedRunner;
}) {
  const claimed = await claimDurableT6Derivative({
    workerId: input.workerId,
  });
  if (!claimed.ok) return claimed;
  return processClaimedT6Derivative({
    workerId: input.workerId,
    claim: claimed.data,
    runner: input.runner,
  });
}
