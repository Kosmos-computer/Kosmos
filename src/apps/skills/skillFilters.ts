import type { SkillMeta, SkillSource } from "@shared/types";

export type SkillSourceFilter = "all" | "seed" | "user" | "app";

export function skillSourceLabel(source: SkillSource): string {
  if (source === "seed") return "Built-in";
  if (source === "user") return "Custom";
  if (source.startsWith("app:")) return source.slice(4);
  return source;
}

export function matchesSkillSource(skill: SkillMeta, filter: SkillSourceFilter): boolean {
  if (filter === "all") return true;
  if (filter === "seed") return skill.source === "seed";
  if (filter === "user") return skill.source === "user";
  return skill.source.startsWith("app:");
}

export function matchesSkillSearch(skill: SkillMeta, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystacks = [
    skill.name,
    skill.description,
    skill.id,
    skillSourceLabel(skill.source),
    ...skill.gates,
  ];
  return haystacks.some((value) => value.toLowerCase().includes(normalized));
}

export function filterSkills(
  skills: SkillMeta[],
  query: string,
  sourceFilter: SkillSourceFilter,
): SkillMeta[] {
  return skills.filter(
    (skill) => matchesSkillSearch(skill, query) && matchesSkillSource(skill, sourceFilter),
  );
}
