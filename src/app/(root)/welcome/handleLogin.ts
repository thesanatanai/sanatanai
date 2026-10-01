import { logger } from "@/utils/utils";
import { CredentialResponse } from "@react-oauth/google";
import jsCookie from "js-cookie";

export default async function handleLogin(
  cardentialResponse: CredentialResponse,
  lang: "en" | "hi",
) {
  const googleToken = cardentialResponse.credential;
  if (!googleToken) return;
  try {
    const response = await fetch("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        credential: googleToken,
        locale: lang,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      jsCookie.set("setupComplete", "true", {
        expires: 365,
      });
    } else {
      logger("Backend authentication failed:", data.error);
    }
  } catch (err) {
    logger("Network Error:", err);
  }
}
