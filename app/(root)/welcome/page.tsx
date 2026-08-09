"use client"
import WelcomeStep from './WelcomeStep'
import { ParticleBackground } from '@/components/Particles'
import '@/css/onboarding.css'
import { useEffect, useState } from 'react'

const Welcome = () => {
    const [step, setStep] = useState<"customize" | "google" | "terms">("terms");
    useEffect(() => {
        async function redirect() {
            const value = await cookieStore.get("setupComplete")
            if(value?.value == "true") window.location.href = "/";
        }
    redirect();
    }, []);
    return (
        <div className="welcome col animated-gradient center-flex">
            <div className="welcome-content glass-dark">
                <WelcomeStep step={step} setStep={setStep} />
                <ParticleBackground />
            </div>
        </div>
    )
}

export default Welcome