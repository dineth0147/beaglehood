import { headers } from "next/headers";
import { env } from "cloudflare:workers";

export type AuthUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
  photo?: string;
  provider?: string;
  isAdmin?: boolean;
};

const SESSION_COOKIE_NAME = "bh_session";

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getAuthUser(req?: Request): Promise<AuthUser | null> {
  let cookieHeader: string | null = null;
  let requestHeaders: Headers | null = null;

  if (req) {
    cookieHeader = req.headers.get("cookie");
  } else {
    try {
      requestHeaders = await headers();
      cookieHeader = requestHeaders.get("cookie");
    } catch {
      // Outside request context
    }
  }

  // 1. Check for custom BeagleHood session cookie
  const sessionToken = parseCookie(cookieHeader, SESSION_COOKIE_NAME);
  if (sessionToken && env.DB) {
    try {
      const row = await env.DB.prepare(
        "SELECT body, created FROM entries WHERE id = ? AND kind = 'session'"
      )
        .bind("session:" + sessionToken)
        .first<{ body: string; created: number }>();

      if (row && Date.now() - row.created < 30 * 86400 * 1000) {
        const data = JSON.parse(row.body);
        const adminCheck = await env.DB.prepare(
          "SELECT 1 FROM entries WHERE (id = 'shop-admin' OR kind = 'admin') AND owner = ?"
        )
          .bind(data.userId)
          .first();

        const adminList = (process.env.ADMIN_EMAILS || 'dinethsachinthagamayt2@gmail.com,dinethsachinthagamareal@gmail.com')
          .split(',')
          .map((e: string) => e.trim().toLowerCase());
        const isEmailAdmin = !!(data.email && adminList.includes(data.email.toLowerCase()));

        return {
          userId: data.userId,
          displayName: data.displayName || data.name || data.email,
          email: data.email,
          fullName: data.fullName || data.name || null,
          photo: data.photo || null,
          provider: data.provider || "google",
          isAdmin: isEmailAdmin || !!adminCheck,
        };
      }
    } catch (e) {
      console.error("Session lookup error:", e);
    }
  }

  // 2. Fallback to ChatGPT SIWC headers or dev loopback identity
  const reqH = requestHeaders || (req ? req.headers : null);
  if (reqH) {
    const oaiUserId = reqH.get("oai-authenticated-user-id");
    const oaiEmail = reqH.get("oai-authenticated-user-email");
    if (oaiUserId && oaiEmail) {
      const encodedName = reqH.get("oai-authenticated-user-full-name");
      const name = encodedName ? decodeURIComponent(encodedName) : null;
      let isAdmin = false;
      if (env.DB) {
        const check = await env.DB.prepare(
          "SELECT 1 FROM entries WHERE id = 'shop-admin' AND owner = ?"
        )
          .bind(oaiUserId)
          .first();
        isAdmin = !!check;
      }
      return {
        userId: oaiUserId,
        displayName: name || oaiEmail,
        email: oaiEmail,
        fullName: name,
        provider: "chatgpt",
        isAdmin,
      };
    }
  }

  return null;
}

export async function createSession(
  db: D1Database,
  user: {
    userId: string;
    email: string;
    name: string;
    photo?: string;
    provider?: string;
    makeAdmin?: boolean;
  }
): Promise<string> {
  const token = crypto.randomUUID();
  const sessionKey = "session:" + token;
  const userKey = "user:" + user.userId;
  const now = Date.now();

  const statements = [
    db
      .prepare(
        "INSERT INTO entries (id, kind, owner, subject, body, created) VALUES (?, 'session', ?, ?, ?, ?)"
      )
      .bind(
        sessionKey,
        user.userId,
        user.email,
        JSON.stringify({
          userId: user.userId,
          email: user.email,
          displayName: user.name,
          fullName: user.name,
          photo: user.photo,
          provider: user.provider || "google",
        }),
        now
      ),
    db
      .prepare(
        "INSERT INTO entries (id, kind, owner, subject, body, created) VALUES (?, 'user', ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET body=excluded.body"
      )
      .bind(
        userKey,
        user.userId,
        user.email,
        JSON.stringify({
          userId: user.userId,
          email: user.email,
          name: user.name,
          photo: user.photo,
        }),
        now
      ),
  ];

  if (user.makeAdmin) {
    statements.push(
      db
        .prepare(
          "INSERT OR REPLACE INTO entries (id, kind, owner, subject, body, created) VALUES (?, 'admin', ?, '', '{}', ?)"
        )
        .bind('admin:' + user.userId, user.userId, now)
    );
  }

  await db.batch(statements);
  return token;
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db
    .prepare("DELETE FROM entries WHERE id = ? AND kind = 'session'")
    .bind("session:" + token)
    .run();
}
