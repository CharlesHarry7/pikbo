/**
 * fal.ai implementation of the video provider seam.
 *
 * Behavior is intentionally identical to the previous inline fal calls in
 * app/api/generate/route.ts so the seam introduces no runtime change.
 */

import { fal } from "@fal-ai/client";

import {
  normalizeRequestId,
  type VideoJobInput,
  type VideoJobResult,
  type VideoProvider,
} from "./videoProvider";

export class FalVideoProvider implements VideoProvider {
  readonly id = "fal" as const;

  isConfigured(): boolean {
    return Boolean(process.env.FAL_KEY);
  }

  private configure(): void {
    fal.config({ credentials: process.env.FAL_KEY });
  }

  async uploadImage(file: File): Promise<string> {
    this.configure();
    return fal.storage.upload(file);
  }

  async runJob(input: VideoJobInput): Promise<VideoJobResult> {
    this.configure();

    const payload: Record<string, unknown> = {
      prompt: input.prompt,
      image_url: input.imageUrl,
      duration: input.duration,
      aspect_ratio: input.aspectRatio,
      resolution: input.resolution,
      generate_audio: input.generateAudio,
    };
    if (
      typeof input.seed === "number" &&
      Number.isFinite(input.seed) &&
      input.seed >= 0
    ) {
      payload.seed = Math.floor(input.seed);
    }

    const result = await fal.subscribe(input.model, {
      input: payload,
      logs: false,
    });

    const data = result.data as { video?: { url?: string } } | undefined;
    return {
      videoUrl: data?.video?.url ?? null,
      requestId: normalizeRequestId(result.requestId),
    };
  }
}
