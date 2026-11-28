import { logger } from "@/utils/utils";
import { signInWithGoogle } from "@/utils/api";
import { CredentialResponse } from "@react-oauth/google";

export default async function handleLogin(
  credentialResponse: CredentialResponse,
  lang: "en" | "hi"
) {
  const googleToken = credentialResponse.credential;
  if (!googleToken) return;
  try {
    await signInWithGoogle(googleToken, lang);
    window.location.href = "/app";
  } catch (err) {
    logger("Sign-in failed:", err);
  }
}
