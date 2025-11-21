declare module "../../server/lib/stubPromptGenerator.js" {
  export function generateStubPrompts(options?: { cwd?: string }): {
    total: number;
    entries: Array<{
      record: {
        type: string;
        slug: string;
        name: string;
        relativePath: string;
      };
      references: Array<{ title: string; slug: string; sourcePath?: string }>;
      prompt: string;
    }>;
    output: string;
  };
  export function serializeStubEntries(entries: Array<any>): Array<{
    type: string;
    slug: string;
    name: string;
    relativePath: string;
    prompt: string;
    references: Array<{ title: string; slug: string; sourcePath?: string }>;
  }>;
}
