// Astro adapter: retain the hosted/dev-only authenticated access policy.
import { requireStagingAccess } from '../_mutating';
import { previewStagingDraft } from '../../../utils/staging';

export async function POST({ request }: { request: Request }) {
  const denied = requireStagingAccess(request);
  if (denied) return denied;
  return previewStagingDraft(request);
}
