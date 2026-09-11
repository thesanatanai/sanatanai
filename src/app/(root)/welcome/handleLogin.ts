import { logger } from "@/utils/utils";
import { CredentialResponse } from "@react-oauth/google";

export default async function handleLogin<K extends string>(
  cardentialResponse: CredentialResponse,
  setters: Record<string, (value: K | boolean) => void>,
  lang: "en" | "hi"
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

    const { userData: data } = await response.json();

    if (response.ok) {
      setters.name(data.name);
      setters.email(data.email);
      setters.picture(data.picture);
      setters.setIsLoading(false);
      setters.setStep("customize" as K);
      setters.language(data.prefferedLocale);
      localStorage.setItem("emailVerified", "true");
    } else {
      logger("Backend authentication failed:", data.error);
    }
  } catch (err) {
    logger("Network Error:", err);
  }
}
