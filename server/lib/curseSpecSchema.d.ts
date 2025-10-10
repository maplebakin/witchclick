import { z } from 'zod';

export const CURSE_TYPES: readonly ['reveal', 'return', 'mirror', 'sever', 'echo'];
export const CURSE_TARGETS: readonly ['space', 'person', 'dynamic', 'memory', 'habit'];
export const CURSE_TONES: readonly ['gentle', 'poetic', 'scathing', 'restrained'];
export const CURSE_TAGS: readonly [
  'white-magic',
  'ethical-curse',
  'returning-energy',
  'truthwork',
  'mirrorcasting',
  'clean-cursing',
];

export declare const CurseGeneratorInputSchema: z.ZodObject<{
  type: z.ZodEnum<typeof CURSE_TYPES>;
  target: z.ZodEnum<typeof CURSE_TARGETS>;
  tone: z.ZodEnum<typeof CURSE_TONES>;
  sigilName: z.ZodOptional<z.ZodString>;
  altarItem: z.ZodOptional<z.ZodString>;
  journalingFollowUp: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
  type: typeof CURSE_TYPES[number];
  target: typeof CURSE_TARGETS[number];
  tone: typeof CURSE_TONES[number];
  sigilName?: string | undefined;
  altarItem?: string | undefined;
  journalingFollowUp?: string | undefined;
}, {
  type: typeof CURSE_TYPES[number];
  target: typeof CURSE_TARGETS[number];
  tone: typeof CURSE_TONES[number];
  sigilName?: string | undefined;
  altarItem?: string | undefined;
  journalingFollowUp?: string | undefined;
}>;

export declare const CurseSpecSchema: z.ZodObject<{
  specVersion: z.ZodLiteral<1>;
  title: z.ZodString;
  slug: z.ZodString;
  openingReflection: z.ZodEffects<z.ZodString, string, string>;
  invocation: z.ZodEffects<z.ZodString, string, string>;
  method: z.ZodEffects<z.ZodString, string, string>;
  closure: z.ZodEffects<z.ZodString, string, string>;
  safetyNotes: z.ZodOptional<z.ZodString>;
  generator: typeof CurseGeneratorInputSchema;
  tags: z.ZodEffects<z.ZodArray<z.ZodEnum<typeof CURSE_TAGS>, "many">, readonly typeof CURSE_TAGS[number][], readonly typeof CURSE_TAGS[number][]>;
}, "strip", z.ZodTypeAny, {
  specVersion: 1;
  title: string;
  slug: string;
  openingReflection: string;
  invocation: string;
  method: string;
  closure: string;
  safetyNotes?: string | undefined;
  generator: z.infer<typeof CurseGeneratorInputSchema>;
  tags: readonly typeof CURSE_TAGS[number][];
}, {
  specVersion: 1;
  title: string;
  slug: string;
  openingReflection: string;
  invocation: string;
  method: string;
  closure: string;
  safetyNotes?: string | undefined;
  generator: z.infer<typeof CurseGeneratorInputSchema>;
  tags: readonly typeof CURSE_TAGS[number][];
}>;

export type CurseGeneratorInput = z.infer<typeof CurseGeneratorInputSchema>;
export type CurseSpec = z.infer<typeof CurseSpecSchema>;

export declare function generateCurseSchemaDocumentation(): string;
export declare function countWords(value: unknown): number;

export default CurseSpecSchema;
