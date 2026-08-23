"use client"
import WelcomeStep from './WelcomeStep'
import { ParticleBackground } from '@/components/Particles'
import '@/css/onboarding.css'
import { useEffect, useState } from 'react'

const Welcome = (props: PageProps<'/welcome'>) => {
    const [step, setStep] = useState<"customize" | "google" | "terms">("terms");
    useEffect(() => {
        async function redirect() {
            const searchParams = await props.searchParams;
            if(searchParams.logout) return cookieStore.delete("setupComplete");
            const value = await cookieStore.get("setupComplete")
            if(value?.value == "true") window.location.href = "/";
        }
    redirect();
    }, [props.searchParams]);
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