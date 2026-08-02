import { PublicLaunchPackSample } from "@/components/PublicLaunchPackSample";
import type { FeedItem } from "@/lib/videoFeed";

export function HomeCinemaHero({ items }: { items: FeedItem[] }) {
  // Keep the canonical feed dependency explicit: it remains the source registry
  // for the archived media, while the front door presents only the fixed trio.
  void items;
  return <PublicLaunchPackSample surface="home" />;
}
