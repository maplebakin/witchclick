import { describe, expect, it } from 'vitest';
import { selectDistinctHomeStories } from '../src/utils/homeReading';

describe('homepage editorial selection', () => {
  it('keeps the newest copy of a repeated story and fills the shelf with other stories', () => {
    const posts = [
      { slug: 'mental-space-3', title: 'Keeping Mental Space Safe from Religious Reminders' },
      { slug: 'mental-space-2', title: '  KEEPING  MENTAL SPACE SAFE from Religious Reminders  ' },
      { slug: 'quiet', title: 'A Quiet Threshold' },
      { slug: 'tarot', title: 'Tarot for Skeptics' },
    ];
    const result = selectDistinctHomeStories(posts, 2);
    expect(result.featured?.slug).toBe('mental-space-3');
    expect(result.recent.map((post) => post.slug)).toEqual(['quiet', 'tarot']);
  });

  it('handles empty collections without rendering a phantom feature', () => {
    expect(selectDistinctHomeStories([])).toEqual({ featured: null, recent: [] });
  });

  it('caps recent entries and prefers the input chronology', () => {
    const posts = Array.from({ length: 12 }, (_, index) => ({
      slug: String(index),
      title: `Article ${index}`,
    }));
    const result = selectDistinctHomeStories(posts, 3);
    expect(result.featured?.slug).toBe('0');
    expect(result.recent.map((post) => post.slug)).toEqual(['1', '2', '3']);
  });
});
