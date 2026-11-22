import { env } from 'cloudflare:workers';
import { createSession } from '@/app/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const rawState = url.searchParams.get('state');

  let returnTo = '/';
  if (rawState) {
    try {
      const parsed = JSON.parse(rawState);
      if (parsed.returnTo && parsed.returnTo.startsWith('/')) {
        returnTo = parsed.returnTo;
      }
    } catch {}
  }

  if (!code) {
    return Response.redirect(new URL(`/login?error=auth_failed&return_to=${encodeURIComponent(returnTo)}`, url.origin), 302);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return Response.redirect(new URL(`/login?error=credentials_missing&return_to=${encodeURIComponent(returnTo)}`, url.origin), 302);
  }

  try {
    const redirectUri = `${url.origin}/api/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Failed to exchange code:', await tokenRes.text());
      return Response.redirect(new URL(`/login?error=token_exchange_failed&return_to=${encodeURIComponent(returnTo)}`, url.origin), 302);
    }

    const tokens = (await tokenRes.json()) as { access_token: string };

    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userinfoRes.ok) {
      return Response.redirect(new URL(`/login?error=profile_fetch_failed&return_to=${encodeURIComponent(returnTo)}`, url.origin), 302);
    }

    const profile = (await userinfoRes.json()) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    };

    if (!env.DB) {
      throw new Error('Database unavailable');
    }

    const adminList = (process.env.ADMIN_EMAILS || 'dinethsachinthagamayt2@gmail.com,dinethsachinthagamareal@gmail.com')
      .split(',')
      .map(e => e.trim().toLowerCase());
    const isEmailAdmin = adminList.includes(profile.email.toLowerCase());

    const token = await createSession(env.DB, {
      userId: 'google:' + profile.sub,
      email: profile.email,
      name: profile.name || profile.email.split('@')[0],
      photo: profile.picture,
      provider: 'google',
      makeAdmin: isEmailAdmin,
    });

    const headers = new Headers();
    headers.set('Location', new URL(returnTo, url.origin).href);
    headers.set('Set-Cookie', `bh_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);

    return new Response(null, { status: 302, headers });
  } catch (err: any) {
    console.error('OAuth callback error:', err);
    return Response.redirect(new URL(`/login?error=${encodeURIComponent(err.message)}&return_to=${encodeURIComponent(returnTo)}`, url.origin), 302);
  }
}
