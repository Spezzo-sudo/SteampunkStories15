
import type { APIRoute } from 'astro';
import { bootstrapAlliances } from '@/lib/api/alliances';

/**
 * API endpoint that provides the full alliance directory and invites for the current player.
 */
export const GET: APIRoute = async () => {
  // TODO: Replace with a real database query.
  const alliances = bootstrapAlliances();
  const invites = {};

  return new Response(
    JSON.stringify({
      alliances,
      invites,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
};
