import { Language, useT } from "@/utils/i18n";
import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { ApiError, requestOtp, verifyOtp } from "@/utils/api";
import Lordicon from "@/components/Lordicon";
import { Edit3 } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export default function Email(props: Record<string, Function>) {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [otpGot, setOtpGot] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const t = useT();
  const currentLanguage = useAppStore((s) => s.language);
  const userEmail = useAppStore((s) => s.setEmail);
  const [timeLeft, setTimeLeft] = useState(120);

  // Single countdown timer. It stops when the user goes back to edit the
  // email, and restarts cleanly after every successful (re)send.
  useEffect(() => {
    if (!otpGot || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [otpGot, timeLeft]);

  async function getOtp() {
    try {
      // First reset error message
      setErrMsg("");
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.exec(email)) return setErrMsg(t("errorInvalidEmail")); // If email is invalid, show an error

      // Show loading until the OTP is being sent
      props.setIsLoading(true);
      const newIn = await requestOtp(email);

      // Set user's information after sending OTP
      userEmail(email);
      setOtp("");
      setTimeLeft(newIn || 120);
      setOtpGot(true);
      props.setIsLoading(false);
    } catch (error) {
      props.setIsLoading(false);
      // Asking again too soon: the server says how long to wait.
      if (error instanceof ApiError && typeof error.body.newIn === "number") {
        userEmail(email);
        setTimeLeft(error.body.newIn);
        setOtpGot(true);
        return;
      }
      setErrMsg(t("sorrySomethingWrong"));
    }
  }

  function editEmail() {
    setOtp("");
    setErrMsg("");
    setOtpGot(false);
  }

  async function validateOtp() {
    if (!otp || !email || errMsg || !otpGot) return;

    try {
      // Reset Error message
      setErrMsg("");

      // Show loading UI until the OTP verifies
      props.setIsLoading(true);
      await verifyOtp(email, otp, currentLanguage);
      props.setIsLoading(false);
      window.location.href = "/app";
    } catch (error) {
      props.setIsLoading(false);
      // The server's own words for a wrong code, an expired code or a lockout.
      if (error instanceof ApiError && error.status < 500) {
        const newIn = error.body.newIn;
        if (typeof newIn === "number") setTimeLeft(newIn);
        return setErrMsg(error.message);
      }
      return setErrMsg(t("errorInvalidOtp"));
    }
  }

  const countdown = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`;

  return (
    <>
      {!otpGot && (
        <>
          <div className="flex gap-2 mt-2 items-center justify-center">
            <label htmlFor="email">
              <Language need="emailLabel" />
            </label>
            <input
              type="email"
              id="email"
              value={email}
              className="modern-input font-poppins"
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
          {/* Sent-to row with edit email */}
          <div className="flex items-center justify-center gap-2 mt-2 text-sm">
            <span className="max-w-[16rem] truncate font-poppins">{email}</span>
            <button
              type="button"
              onClick={editEmail}
              aria-label="Edit email"
              className="secondary-btn"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>

          <div className="flex gap-2 mt-2 items-center">
            <label htmlFor="otp">OTP: </label>
            <input
              type="text"
              id="otp"
              className="modern-input font-poppins"
              autoComplete="one-time-code"
              maxLength={6}
              inputMode="numeric"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value);
                setErrMsg("");
              }}
            />
          </div>
          <div className="flex flex-row gap-4 mt-2.5">
          {(timeLeft < 1) && (
            <button
              type="button"
              onClick={getOtp}
              className="secondary-btn rounded-xl! m-auto"
            >
              <Language need="resendOTP" />
            </button>
          )}
          <button
            className="btn-gradient welcomeButton"
            onClick={validateOtp}
          >
            <Language need="submit" />
          </button></div>

          {/* Resend OTP */}
          {timeLeft > 0 && (
            <p className="mt-4 text-sm text-white/60 tabular-nums font-poppins">
              <Language need="requestOtpIn" />
              {countdown}
            </p>
          )}
        </>
      )}
    </>
  );
}