"use client";

import { useMemo, useState } from "react";
import { VideoTile } from "@/components/VideoTile";
import {
  CATEGORIES,
  type CategoryId,
} from "@/lib/presets";
import type { FeedItem } from "@/lib/videoFeed";

type RecipeCategory = "all" | CategoryId;

export function RecipeBrowser({ items }: { items: FeedItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<RecipeCategory>("all");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!needle) return true;
      return [
        item.title,
        item.subtitle,
        item.recipeSlug,
        item.badge,
        item.mediaProvenance,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [category, items, query]);

  return (
    <section
      className="px-3 py-8 sm:px-5"
      aria-labelledby="recipe-browser-title"
      data-recipe-browser="search-category"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c8ff3d]">
              Searchable recipe library
            </p>
            <h2
              id="recipe-browser-title"
              className="mt-1 font-display text-2xl font-black uppercase tracking-tight text-white sm:text-3xl"
            >
              Find the seller job, then inspect its media truth.
            </h2>
          </div>
          <label className="block w-full lg:max-w-sm">
            <span className="sr-only">Search recipes</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search spin, reveal, dance, listing…"
              className="w-full rounded-full border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#c8ff3d]/55"
              data-recipe-search
            />
          </label>
        </div>

        <div
          className="mt-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Recipe categories"
          data-recipe-category-tabs
        >
          {[
            { id: "all" as const, label: "All" },
            ...CATEGORIES.map((item) => ({ id: item.id, label: item.label })),
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={category === item.id}
              onClick={() => setCategory(item.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${
                category === item.id
                  ? "bg-[#c8ff3d] text-black"
                  : "border border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p
          className="mb-4 mt-1 text-[11px] font-semibold text-white/38"
          aria-live="polite"
        >
          {visible.length} recipe{visible.length === 1 ? "" : "s"} · media
          provenance is shown on every card
        </p>

        {visible.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {visible.map((item) => (
              <VideoTile key={item.id} item={item} compact />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-5 py-14 text-center">
            <p className="text-sm font-bold text-white">No matching recipe</p>
            <p className="mt-1 text-xs text-white/40">
              Try a broader job or switch categories. Concept recipes remain
              static until unique footage exists.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
              className="mt-4 rounded-full border border-[#c8ff3d]/35 px-4 py-2 text-xs font-black text-[#c8ff3d]"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
