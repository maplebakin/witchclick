import colors from "tailwindcss/colors";

const FALLBACK_COLOR = "#7c3aed";

type TailwindColors = typeof colors;

type Palette = string | { [shade: string]: string };

function getPalette(name: string): Palette | undefined {
  return (colors as TailwindColors)[name as keyof TailwindColors] as Palette | undefined;
}

export function resolveTailwindColor(token: string | undefined | null): string {
  if (!token) return FALLBACK_COLOR;
  const [rawName, rawShade] = token.split("-");
  const name = rawName?.trim();
  const shade = rawShade?.trim();
  if (!name) return FALLBACK_COLOR;

  const palette = getPalette(name);
  if (typeof palette === "string") {
    return palette || FALLBACK_COLOR;
  }

  if (palette && shade && shade in palette) {
    return palette[shade];
  }

  if (palette && "500" in palette) {
    return palette["500"];
  }

  return FALLBACK_COLOR;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace(/[^0-9a-fA-F]/g, "");
  if (normalized.length !== 3 && normalized.length !== 6) {
    return { r: 124, g: 58, b: 237 };
  }

  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const int = parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

export function toRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const clamped = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

export function mixColors(colorA: string, colorB: string, weight: number): string {
  const ratio = Math.min(1, Math.max(0, weight));
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);

  const r = Math.round(a.r * (1 - ratio) + b.r * ratio);
  const g = Math.round(a.g * (1 - ratio) + b.g * ratio);
  const bChannel = Math.round(a.b * (1 - ratio) + b.b * ratio);

  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(bChannel)}`;
}
