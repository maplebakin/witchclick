# Cauldron Prompt Engine Plan

1. **Survey existing scaffolding**
   - Read the current placeholder components and sample draft JSON to understand desired layout and data fields.
   - Inventory available scripts/utilities that should inform the prompt workflow.
2. **Model draft + prompt data**
   - Define TypeScript interfaces for PostSpec drafts and prompt configuration.
   - Create a loader that imports seed drafts from `src/data/drafts` and exposes them to the UI.
3. **Introduce an interactive workspace**
   - Add the Preact integration so we can render an island that owns state for editor, preview, and prompt assembly.
   - Build a `PromptEngine` component that renders the full layout (sidebar, editor, preview) while syncing edits to state.
4. **Implement prompt composition + editing tools**
   - Provide form controls for metadata, outline, sections, and prompt blueprint fields.
   - Generate a live prompt string based on the blueprint and current draft contents so writers can copy it into LLM tooling.
   - Mirror edits immediately into a draft preview card that renders markdown.
5. **Persist + export drafts for ingestion**
   - Wire the control bar actions: save to `localStorage`, copy JSON, and download a draft file for later publishing workflows.
   - Surface local drafts in the sidebar alongside seed files so they can be reopened and revised.
6. **Polish and document**
   - Apply styling consistent with the existing aesthetic.
   - Update the landing page to mount the new prompt engine and remove unused placeholder components.
   - Ensure README or inline docs mention the new workflow if needed.
