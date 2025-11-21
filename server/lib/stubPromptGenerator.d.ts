export type StubReference = {
  title: string;
  slug: string;
  sourcePath?: string;
};

export type SerializedStubEntry = {
  type: string;
  slug: string;
  name: string;
  relativePath: string;
  prompt: string;
  references: StubReference[];
};

export declare function generateStubPrompts(options?: { cwd?: string }): {
  total: number;
  entries: Array<{
    record: {
      type: string;
      slug: string;
      name: string;
      summary: string;
      relativePath: string;
    };
    references: StubReference[];
    prompt: string;
  }>;
  output: string;
};

export declare function serializeStubEntries(entries: Array<any>): SerializedStubEntry[];
