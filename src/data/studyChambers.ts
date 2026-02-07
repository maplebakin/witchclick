export interface ChamberDefinition {
  slug: string;
  title: string;
  subtitle: string;
  placeholder: string[];
}

export const CHAMBERS: ChamberDefinition[] = [
  {
    slug: 'herbary',
    title: 'Herbary',
    subtitle: 'Shelves of grounded plant wisdom',
    placeholder: [
      'Placeholder altar: ingredient cards and quick-reference correspondences.',
      'Future ritual: draft and revise herb entity pages with low-spoons prompts.',
    ],
  },
  {
    slug: 'crystal-grotto',
    title: 'Crystal Grotto',
    subtitle: 'A quiet archive of mineral notes',
    placeholder: [
      'Placeholder altar: crystal summaries, care notes, and comparison slots.',
      'Future ritual: inscribe stone pages directly into the Grimoire editor.',
    ],
  },
  {
    slug: 'moon-chamber',
    title: 'Moon Chamber',
    subtitle: 'Phase-aware planning and reflection',
    placeholder: [
      'Placeholder altar: moon phase prompts and timing windows for drafts.',
      'Future ritual: weave date-aware guidance into publish workflows.',
    ],
  },
  {
    slug: 'grimoire',
    title: 'Grimoire',
    subtitle: 'The master book of sealed workings',
    placeholder: [
      'Placeholder altar: Open Grimoire -> Inscribe Page -> Seal Working flow.',
      'Future ritual: save drafts and publish pages without brittle handoffs.',
    ],
  },
];
