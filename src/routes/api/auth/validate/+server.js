import { json } from '@sveltejs/kit';
import { authenticateRequest } from '$lib/auth-middleware';

export async function GET({ request }) {
  const result = await authenticateRequest(request);
  if (!result.success) return json(result, { status: result.status });
  return json({ success: true, user: result.user });
}
