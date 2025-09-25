"use client";
import Prism from "../../../components/ui/prism";
import { MagicButton } from "./common/MagicButton";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useHyperdrive } from "../contexts/HyperdriveContext";

export function Welcome() {
    const navigate = useNavigate();
    const { loaded, profile, updateProfile } = useHyperdrive();
    const [username, setUsername] = useState("");
    const [saving, setSaving] = useState(false);

    const needsProfile = useMemo(() => {
        const name = (profile as any)?.name;
        const result = !name || typeof name !== "string" || name.trim().length === 0;
        console.log('[Welcome] needsProfile calculation - profile:', profile, 'name:', name, 'needsProfile:', result);
        return result;
    }, [profile]);

    console.log('[Welcome] Render - loaded:', loaded, 'profile:', profile, 'needsProfile:', needsProfile, 'username state:', username);

    useEffect(() => {
        const name = (profile as any)?.name;
        if (name && typeof name === "string") setUsername(name);
    }, [profile]);

    // Note: Auto-redirect is now handled in App.tsx to prevent flickering

    async function handleContinue() {
        if (!needsProfile) {
            navigate('/drives');
            return;
        }
        if (!username.trim()) return;
        try {
            setSaving(true);
            await updateProfile({ name: username.trim() });
            navigate('/drives');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="h-screen bg-black flex items-center justify-center overflow-hidden relative">
            <div className="absolute inset-0 w-full h-full">
                <Prism
                    animationType="rotate"
                    timeScale={0.2}
                    height={2}
                    baseWidth={6}
                    scale={2.5}
                    hueShift={0}
                    colorFrequency={1.7}
                    noise={0.5}
                    glow={0.2}
                    suspendWhenOffscreen={true}
                />
            </div>

            <div className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center">
                <p className="text-2xl md:text-4xl lg:text-7xl text-white font-bold inter-var">
                    Welcome to HyperTeleporter
                </p>
                <p className="text-base md:text-lg mt-4 text-white/90 font-normal inter-var">
                    The ultimate P2P file sharing app powered by Hyperdrive.
                </p>

                {loaded && needsProfile ? (
                    <div className="mt-8 mx-auto max-w-md">
                        <label className="block text-left text-white/90 mb-2">Choose a username</label>
                        <input
                            className="w-full rounded-md px-4 py-3 bg-white/10 text-white placeholder-white/50 focus:outline-none"
                            placeholder="e.g. caner"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <div className="flex justify-center mt-6">
                            <MagicButton
                                className="mx-auto"
                                onClick={handleContinue}
                                disabled={saving || !username.trim()}
                                loading={saving}
                            >
                                Continue
                            </MagicButton>
                        </div>
                        <p className="text-xs text-white/60 mt-3">We’ll use this in your profile. You can change it later.</p>
                    </div>
                ) : (
                    <div className="flex justify-center mt-6">
                        <MagicButton className="mx-auto" onClick={() => navigate('/drives')}>Get Started</MagicButton>
                    </div>
                )}
            </div>
        </div>
    );
}
