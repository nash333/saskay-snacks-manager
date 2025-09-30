import { json } from '@remix-run/node';

// Import the helper which uses the app's authenticate.admin(request) flow
import { setupMetaobjectsWithAuth } from '../../../scripts/setup-metaobjects';

export async function loader({ request }: { request: Request }) {
  // Guard: only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return json({ success: false, error: 'Not allowed in production' }, { status: 403 });
  }

  try {
    const result = await setupMetaobjectsWithAuth(request);
    return json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return json({ success: false, error: msg }, { status: 500 });
  }
}

export default function Route() {
  return null;
}
