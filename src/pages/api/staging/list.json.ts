// Astro adapter: retain the hosted/dev-only authenticated access policy.
import { requireStagingAccess } from '../_mutating';
import { listStagingDrafts } from '../../../utils/staging';

export async function GET({ request }: { request: Request }) {
  const denied = requireStagingAccess(request);
  if (denied) return denied;
  return listStagingDrafts();
}

export const POST = GET;
