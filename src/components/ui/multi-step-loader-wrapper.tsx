"use client";
import React, { useState } from "react";
import { MultiStepLoader } from "./multi-step-loader";
import { LoadingState, MultiStepLoaderOptions } from "./use-multi-step-loader";
import { IconSquareRoundedX } from "@tabler/icons-react";

interface MultiStepLoaderWrapperProps {
  loadingStates: LoadingState[];
  loading: boolean;
  onStop?: () => void;
  showStopButton?: boolean;
  stopButtonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  stopButtonClass?: string;
  duration?: number;
  loop?: boolean;
  className?: string;
}

export function MultiStepLoaderWrapper({
  loadingStates,
  loading,
  onStop,
  showStopButton = true,
  stopButtonPosition = 'top-right',
  stopButtonClass = "text-black dark:text-white z-[120]",
  duration = 2000,
  loop = true,
  className,
}: MultiStepLoaderWrapperProps) {
  const getStopButtonPosition = () => {
    switch (stopButtonPosition) {
      case 'top-left':
        return 'fixed top-4 left-4';
      case 'bottom-right':
        return 'fixed bottom-4 right-4';
      case 'bottom-left':
        return 'fixed bottom-4 left-4';
      default:
        return 'fixed top-4 right-4';
    }
  };

  return (
    <>
      <MultiStepLoader
        loadingStates={loadingStates}
        loading={loading}
        duration={duration}
        loop={loop}
      />
      
      {loading && showStopButton && onStop && (
        <button
          className={`${getStopButtonPosition()} ${stopButtonClass}`}
          onClick={onStop}
          title="Stop loading"
        >
          <IconSquareRoundedX className="h-10 w-10" />
        </button>
      )}
    </>
  );
}

// Demo component showing how to use the wrapper
export function MultiStepLoaderDemo() {
  const [loading, setLoading] = useState(false);
  
  const demoStates: LoadingState[] = [
    { text: "Buying a condo" },
    { text: "Travelling in a flight" },
    { text: "Meeting Tyler Durden" },
    { text: "He makes soap" },
    { text: "We goto a bar" },
    { text: "Start a fight" },
    { text: "We like it" },
    { text: "Welcome to F**** C***" },
  ];

  return (
    <div className="w-full h-[60vh] flex items-center justify-center">
      <MultiStepLoaderWrapper
        loadingStates={demoStates}
        loading={loading}
        onStop={() => setLoading(false)}
        showStopButton={true}
        stopButtonPosition="top-right"
      />

      <button
        onClick={() => setLoading(true)}
        className="bg-[#39C3EF] hover:bg-[#39C3EF]/90 text-black mx-auto text-sm md:text-base transition font-medium duration-200 h-10 rounded-lg px-8 flex items-center justify-center"
        style={{
          boxShadow:
            "0px -1px 0px 0px #ffffff40 inset, 0px 1px 0px 0px #ffffff40 inset",
        }}
      >
        Click to load
      </button>
    </div>
  );
}
