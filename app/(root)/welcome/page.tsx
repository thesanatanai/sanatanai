"use client";

import WelcomeStep from "./WelcomeStep";
import jsCookie from "js-cookie";
import { ParticleBackground } from "@/components/Particles";
import "@/css/onboarding.css";
import { useEffect, useState } from "react";

const Welcome = () => {
    const [step, setStep] = useState<"customize" | "google" | "terms">("terms");

    useEffect(() => {
        async function redirect() {
            // Read the actual browser URL.
            const logout =
                new URLSearchParams(window.location.search).get("logout") ===
                "true";

            // Logout URL must always bypass the redirect check.
            if (logout) {
                jsCookie.remove("setupComplete");
                return;
            }

            const value = jsCookie.get("setupComplete");

            if (value === "true") {
                window.location.replace("/");
            }
        }

        redirect();
    }, []);

    return (
        <div className="welcome col animated-gradient center-flex">
            <div className="welcome-content glass-dark font-display">
                <WelcomeStep step={step} setStep={setStep} />
                <ParticleBackground />
            </div>
        </div>
    );
};

export default Welcome;