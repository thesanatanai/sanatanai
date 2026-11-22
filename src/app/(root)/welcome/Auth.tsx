/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { useContext, useMemo, useState } from "react";
import { All } from "../AllContext";
import { Language } from "@/utils/i18n";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import handleLogin from "./handleLogin";
import { useNotification } from "@/components/Notification";
import Email from "./Email";

function Google(props: Record<string, Function>) {
  const notification = useNotification();
  const { userData } = useContext(All);
  const [currentLanguage] = userData.language;
  return (
    <div className="login-container center-flex">
      <div id="google-login-btn">
        <GoogleOAuthProvider
          clientId={process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || ""}
        >
          <GoogleLogin
            onSuccess={(response) => handleLogin(response, currentLanguage)}
            click_listener={() => props.setIsLoading((loading : boolean) => !loading)}
            shape="pill"
            auto_select
            useOneTap
            onError={() => {
              notification("loginError", {
                type: "error",
                language: true,
              });
              props.setIsLoading(false);
            }}
          />
        </GoogleOAuthProvider>
      </div>
    </div>
  );
}

export default function Auth(props: Record<string, Function>) {
  const isDesktop = useMemo(() => {
    if (!globalThis.window) return false;
    return !!(globalThis as Record<string, unknown>).__TAURI__;
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  return (
    <>
      <h1 className="welcome-title animated-gradient-text">
        <Language need="welcomeSeeker" />
      </h1>
      <h2 className="welcome-subtext font-display text-center">
        <Language need="loginJourney" />
      </h2>

      {!isDesktop && (
        <>
          <Google setStep={props.setStep} setIsLoading={setIsLoading} />
          <span className="center-flex gap-2">
            <span className="w-25 bg-[#777] h-px flex"></span>
            <span>or</span>
            <span className="w-25 bg-[#777] h-px flex"></span>
          </span>
        </>
      )}
      <Email setStep={props.setStep} setIsLoading={setIsLoading} />
      {isLoading && (
        <div className="w-full h-full absolute z-50 backdrop-blur-[1px] center-flex">
          <div className="w-10 h-10 border-4 border-t-blue-400! animate-spin rounded-[50%] shadow-2xl ring-8 ring-black" />
        </div>
      )}
    </>
  );
}
