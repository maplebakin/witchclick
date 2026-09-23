import { loadAllPosts, firstParagraph, getPostCategory } from "../utils/posts";
import { readAllEntities } from "../utils/entities.js";
import { loadAllCurses } from "../utils/curses";
import { HUB_DEFINITIONS } from "../data/hubs";
import { extractReflectionPrompts } from "../utils/reflectionPrompts";
import { loadRitualLabEntries } from "../utils/ritualLab";

export const prerender = true;

export async function GET() {
  const posts = loadAllPosts();
  const postItems = posts.map((post) => {
    const data = post.data ?? {};
    const slug = post.slug;
    const category = getPostCategory(post);
    const rawExcerpt =
      data.excerpt ?? data.description ?? data.metaDescription ?? firstParagraph(post.content ?? "");

    return {
      slug,
      href: `/post/${slug}`,
      type: category === "meandering" ? "Field note" : "Article",
      title: String(data.title ?? post.title ?? slug),
      excerpt: String(rawExcerpt ?? ""),
      tags: Array.isArray(data.tags) ? data.tags : [],
      category, // Include category for client-side filtering
    };
  });

  const entities = readAllEntities({ includeUnpublished: false });
  const entityItems = Object.values(entities).flatMap((entries) =>
    (Array.isArray(entries) ? entries : []).map((entity: any) => ({
      slug: entity.slug,
      href: `/entities/${entity.type}/${entity.slug}`,
      type: "Grimoire",
      title: String(entity.name || entity.slug),
      excerpt: String(entity.summary || ""),
      tags: Object.values(entity.properties || {}).flatMap((value) =>
        Array.isArray(value) ? value.map(String) : typeof value === "string" ? [value] : [],
      ),
      category: "entity",
    })),
  );

  const curseItems = loadAllCurses().map((curse) => ({
    slug: curse.slug,
    href: `/curses/${curse.slug}`,
    type: "Clean Cursing",
    title: curse.title,
    excerpt: curse.tldr || curse.invocation,
    tags: curse.tags,
    category: "curse",
  }));

  const hubItems = [
    {
      slug: "hub",
      href: "/hub",
      type: "Hub",
      title: "Rituals & Spreads",
      excerpt: "Pathways into release, focus, and grounding rituals, tarot spreads, and symbolic workings.",
      tags: ["rituals", "spreads", "release", "focus", "calm", "grounding"],
      category: "hub",
    },
    ...Object.values(HUB_DEFINITIONS).map((hub) => ({
      slug: hub.slug,
      href: `/hub/${hub.slug}`,
      type: "Hub",
      title: hub.hero.title,
      excerpt: hub.seoDescription,
      tags: Array.from(
        new Set([
          hub.hero.eyebrow,
          hub.hero.title,
          ...hub.playlists.flatMap((playlist) => [playlist.title, ...playlist.chips]),
        ]),
      ),
      category: "hub",
    })),
  ];

  const labEntries = loadRitualLabEntries();
  const sampler = labEntries.find((entry) => entry.slug === "lab-three-day-sampler");
  const toolItems = [
    {
      slug: "tools",
      href: "/tools",
      type: "Practice tool",
      title: "Practice Tools",
      excerpt: "Printables, ritual supports, and curated tools for reflection, tarot, and meaning-making.",
      tags: ["printables", "ritual", "tarot", "reflection", "tools"],
      category: "tool",
    },
    {
      slug: "ritual-lab",
      href: "/lab",
      type: "Interactive tool",
      title: "Ritual Lab",
      excerpt: "An experimental ritual workshop for testing small practices, reflective tools, and printable supports.",
      tags: ["ritual", "lab", "practice", "reflection", "tools"],
      category: "tool",
    },
    {
      slug: "three-day-sampler",
      href: "/lab/three-day-sampler",
      type: "Printable",
      title: "Three-Day Ritual Sampler",
      excerpt: sampler?.summary ?? "A printable planner for three days of morning, midday, and evening rituals.",
      tags: ["printable", "planner", "sampler", "ritual", "three-day"],
      category: "tool",
    },
  ];

  const reflectionSamplerItems = posts.flatMap((post) => {
    const data = post.data ?? {};
    if (extractReflectionPrompts(data, post.content ?? "").length === 0) return [];
    const title = String(data.title ?? post.title ?? post.slug);
    const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
    return [{
      slug: post.slug,
      href: `/sampler/${post.slug}`,
      type: "Reflection sampler",
      title,
      excerpt: String(data.description ?? data.excerpt ?? "Reflection prompts and a next step from this practice."),
      tags: Array.from(new Set([...tags, "reflection", "sampler"])),
      category: "tool",
    }];
  });

  const items = [...postItems, ...entityItems, ...curseItems, ...hubItems, ...toolItems, ...reflectionSamplerItems];

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
