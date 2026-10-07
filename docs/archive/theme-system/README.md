# Legacy WitchClick theme-system data

Archived on **2026-10-07** during Theme Rework Phase 7.

These files preserve the historical preset-based theme system for design reference.
The Theme Editor client and APIs, preset generator, preset-writing CLI, Base
preset resolution/browser storage loader, and resolver/cache have been retired.
The archive is not loaded by public pages or the admin manifest viewer.

## Provenance and original paths

| Archived path | Original path | Contents |
| --- | --- | --- |
| `legacy-presets/*.json` (excluding `active.json`) | `content/themes/*.json` | 14 historical midnight/dawn presets |
| `legacy-presets/active.json` | `content/themes/active.json` | Historical active mapping |
| `theme.json` | `content/theme.json` | Legacy theme configuration |
| `color-tokens.json` | `content/color-tokens.json` | Legacy colour-token data |

All 17 files were moved without reformatting, regeneration, or newline
normalization. The active mapping preserves the current dirty worktree bytes,
not an earlier committed version. `checksums.sha256` records the pre-move SHA-256
of every data file, with paths relative to this directory.

No theme-background asset directory was present in this checkout.

## Current replacement and retained fallback

WitchClick consumes `src/theme-kits/autumn-window/1.0.0/kit.css` and its manifest
through `src/styles/autumn-window-kit-adapter.css`. `/admin/theme` displays that
manifest directly and provides no preset editing or activation.

`src/styles/color-tokens.generated.css` remains in its original location as an
imported static fallback. It is not archived, regenerated, or removed by this move.
The public Autumn Window fallback CSS and WitchClick-owned comfort/status
behaviour remain outside this archive.

## Integrity and inspection

From the repository root:

```sh
(cd docs/archive/theme-system && sha256sum -c checksums.sha256)
npm run themes:lint
```

The lint command validates the 14 archived presets for required settings and
unique slug/mode pairs. The historical active mapping is retained but excluded
from preset-schema linting. Neither command writes or activates theme data.
