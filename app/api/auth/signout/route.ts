import { env } from 'cloudflare:workers';
import { deleteSession } from '@/app/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get('return_to') || '/';

  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)bh_session=([^;]*)/);
  const token = match ? decodeURIComponent(match[1]) : null;

  if (token && env.DB) {
    try {
      await deleteSession(env.DB, token);
    } catch {}
  }

  const headers = new Headers();
  headers.set('Location', new URL(returnTo, url.origin).href);
  headers.set('Set-Cookie', 'bh_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

  return new Response(null, { status: 302, headers });
}
