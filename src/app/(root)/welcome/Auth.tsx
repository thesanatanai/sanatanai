/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { useContext, useMemo, useState } from "react";
import { All } from "../AllContext";
import { Language, useT } from "@/utils/i18n";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import handleLogin from "./handleLogin";
import { useNotification } from "@/components/Notification";
import Lordicon from "@/components/Lordicon";
import jsCookie from "js-cookie";

function Google(props: Record<string, Function>) {
  const notification = useNotification<true>();
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
            click_listener={() => props.setIsLoading(true)}
            shape="pill"
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

function Email(props: Record<string, Function>) {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [otpGot, setOtpGot] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const t = useT();
  const { userData } = useContext(All);
  const [currentLanguage] = userData.language;
  const userEmail = userData.email[1];

  async function getOtp() {
    try {
      if (otpGot) return;

      // First reset error message
      setErrMsg("");
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.exec(email)) return setErrMsg(t("errorInvalidEmail")); // If email is invalid, show an error

      // Show loading until the OTP is being sent
      props.setIsLoading(true);
      const res = await fetch("api/user/otp", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const { error } = await res.json();
      if (error) {
        throw new Error(error);
      }

      // Set user's information after sending OTP
      userEmail(email);
      setOtpGot(true);
      props.setIsLoading(false);
    } catch {
      props.setIsLoading(false);
      setErrMsg(t("sorrySomethingWrong"));
    }
  }
  async function validateOtp() {
    if (!otp || !email || errMsg || !otpGot) return;

    try {
      // Reset Error message
      setErrMsg("");

      // Show loading UI until the OTP verifies
      props.setIsLoading(true);
      const user = await fetch("api/user/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
          locale: currentLanguage,
        }),
      }).then((res) => res.json());

      // Send error message if caught
      if (user.error) return setErrMsg(user.error);

      jsCookie.set("setupComplete", "true", {
        expires: 365,
      });
    } catch {
      return setErrMsg(t("errorInvalidOtp"));
    }
  }
  return (
    <>
      {!otpGot && (
        <>
          <div className="flex gap-2 mt-2 items-center justify-center">
            <label htmlFor="email">
              <Language need="emailLabel" />
            </label>
            <input
              type="text"
              id="email"
              value={email}
              className="modern-input"
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <button
            className="btn-gradient mt-2 welcomeButton center-flex"
            onClick={getOtp}
          >
            <Language need="sendOTP" />
            <Lordicon
              src="arrow"
              target="parent"
              colors="primary:#ffffff,secondary:#ffffff"
            />
          </button>
        </>
      )}
      <p className="text-red-400 mt-2">{errMsg}</p>
      {otpGot && (
        <>
          <div className="flex gap-2 mt-2">
            <label htmlFor="otp">OTP: </label>
            <input
              type="text"
              id="otp"
              className="modern-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
          <button
            className="btn-gradient mt-2 welcomeButton"
            onClick={validateOtp}
          >
            <Language need="submit" />
          </button>
        </>
      )}
    </>
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
          <div className="w-10 h-10 border-4 border-t-blue-400 animate-spin rounded-[50%] shadow-2xl ring-8 ring-black" />
        </div>
      )}
    </>
  );
}
