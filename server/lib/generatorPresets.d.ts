export interface GeneratorPreset {
  label: string;
  system: string;
  goal: string;
  looseOutputContract: string[];
  strictOutputContract: string[];
}

export declare const generatorPresetOptions: Array<{
  key: string;
  label: string;
  description: string;
}>;

export declare function resolveGeneratorPresetKey(value: unknown): string | null;
export declare function getGeneratorPreset(value: unknown): GeneratorPreset | undefined;

declare const presets: Record<string, GeneratorPreset>;
export default presets;
