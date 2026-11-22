import { env } from 'cloudflare:workers';
import { createSession } from '@/app/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const role = url.searchParams.get('role') || 'customer';
  const returnTo = url.searchParams.get('return_to') || (role === 'admin' ? '/admin' : '/');

  if (!env.DB) {
    return new Response('Database binding DB is missing', { status: 500 });
  }

  const isAdmin = role === 'admin';
  const user = {
    userId: isAdmin ? 'local_seedy' : 'demo_customer_' + Math.floor(Math.random() * 1000),
    email: isAdmin ? 'seedy@beaglehood.com' : 'doglover@beaglehood.com',
    name: isAdmin ? 'Seedy (Shop Owner)' : 'Happy Dog Parent',
    provider: 'demo',
    makeAdmin: isAdmin,
  };

  const token = await createSession(env.DB, user);

  const headers = new Headers();
  headers.set('Location', new URL(returnTo, url.origin).href);
  headers.set('Set-Cookie', `bh_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);

  return new Response(null, { status: 302, headers });
}
