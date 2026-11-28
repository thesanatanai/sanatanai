"use client";

import WelcomeStep from "./WelcomeStep";
import { ParticleBackground } from "@/components/Particles";
import "@/css/onboarding.css";
import { useEffect, useState } from "react";
import { signOut } from "@/utils/api";

const Welcome = () => {
    const [step, setStep] = useState<"google" | "terms">("terms");

    useEffect(() => {
        // Read the actual browser URL.
        const logout =
            new URLSearchParams(window.location.search).get("logout") ===
            "true";

        // The logout URL always shows this page, and ends the session on the server.
        if (logout) {
            void signOut();
        }
        // A visitor who is signed in never gets here: the proxy sends them to the app.
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