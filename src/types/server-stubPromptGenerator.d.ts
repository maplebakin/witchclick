declare module "../../../server/lib/stubPromptGenerator.js" {
  export function generateStubPrompts(options?: { cwd?: string }): {
    total: number;
    entries: Array<any>;
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

  export function generatePostStubPrompts(options?: { cwd?: string }): {
    total: number;
    entries: Array<any>;
    output: string;
  };

  export function serializePostStubEntries(entries: Array<any>): Array<any>;

  export function generateStubArticlePrompt(stubArticle: any): string;
}

declare module "../../../../server/lib/stubPromptGenerator.js" {
  export function generateStubPrompts(options?: { cwd?: string }): {
    total: number;
    entries: Array<any>;
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

  export function generatePostStubPrompts(options?: { cwd?: string }): {
    total: number;
    entries: Array<any>;
    output: string;
  };

  export function serializePostStubEntries(entries: Array<any>): Array<any>;

  export function generateStubArticlePrompt(stubArticle: any): string;
}
