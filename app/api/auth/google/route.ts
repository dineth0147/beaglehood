export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get('return_to') || '/';

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return Response.redirect(
      new URL(`/login?error=google_not_configured&return_to=${encodeURIComponent(returnTo)}`, url.origin),
      302
    );
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const state = JSON.stringify({ returnTo, nonce: crypto.randomUUID() });

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('prompt', 'select_account');

  return Response.redirect(googleAuthUrl.toString(), 302);
}
