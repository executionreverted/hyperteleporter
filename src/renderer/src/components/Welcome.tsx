"use client";
import React from "react";
import { WavyBackground } from "../../../components/ui/wavy-background";
import { MagicButton } from "./common/MagicButton";

export function Welcome() {
    return (
        <WavyBackground className="max-w-4xl mx-auto">
            <p className="text-2xl md:text-4xl lg:text-7xl text-white font-bold inter-var text-center">
                Welcome to Teleport
            </p>
            <p className="text-base md:text-lg mt-4 text-white font-normal inter-var text-center">
                The ultimate P2P file sharing app powered by Hyperdrive.
            </p>
            {/* center button */}
            <div className="flex justify-center mt-4">
                <MagicButton className="mt-4 mx-auto">Get Started</MagicButton>
            </div>
        </WavyBackground>
    );
}
