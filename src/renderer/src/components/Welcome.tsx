"use client";
import Prism from "../../../components/ui/prism";
import { MagicButton } from "./common/MagicButton";
import { useNavigate } from "react-router-dom";

export function Welcome() {
    const navigate = useNavigate();
    return (
        <div className="h-screen bg-black flex items-center justify-center overflow-hidden relative">
            <div className="absolute inset-0 w-full h-full">
                <Prism
                    animationType="rotate"
                    timeScale={0.5}
                    height={2}
                    baseWidth={6}
                    scale={2.5}
                    hueShift={0}
                    colorFrequency={2.7}
                    noise={0.5}
                    glow={1}
                    suspendWhenOffscreen={true}
                />
            </div>

            <div className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center">
                <p className="text-2xl md:text-4xl lg:text-7xl text-white font-bold inter-var">
                    Welcome to Teleport
                </p>
                <p className="text-base md:text-lg mt-4 text-white/90 font-normal inter-var">
                    The ultimate P2P file sharing app powered by Hyperdrive.
                </p>
                <div className="flex justify-center mt-6">
                    <MagicButton className="mx-auto" onClick={() => navigate('/drives')}>Get Started</MagicButton>
                </div>
            </div>
        </div>
    );
}
