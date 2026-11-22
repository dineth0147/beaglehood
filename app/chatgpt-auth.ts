import { getAuthUser, type AuthUser } from "./auth";

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
  photo?: string;
  isAdmin?: boolean;
};

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const user = await getAuthUser();
  if (!user) return null;
  return {
    userId: user.userId,
    displayName: user.displayName,
    email: user.email,
    fullName: user.fullName,
    photo: user.photo,
    isAdmin: user.isAdmin,
  };
}

export function chatGPTSignInPath(returnTo = "/account"): string {
  return `/login?return_to=${encodeURIComponent(returnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  return `/api/auth/signout?return_to=${encodeURIComponent(returnTo)}`;
}
