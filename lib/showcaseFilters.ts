import type {
  ShowcaseCategory,
  ShowcaseProject,
} from "@/lib/showcaseProjects";

export type ExploreCategory = "all" | ShowcaseCategory;

/** Pure filter used by the Explore UI and source-level contract tests. */
export function filterShowcaseProjects(
  projects: readonly ShowcaseProject[],
  category: ExploreCategory
): ShowcaseProject[] {
  return category === "all"
    ? [...projects]
    : projects.filter((project) => project.category === category);
}
