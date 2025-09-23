"use client";
import React, { useState } from "react";
import { useMultiStepLoader, COMMON_LOADING_STATES } from "./use-multi-step-loader";
import { MultiStepLoaderWrapper } from "./multi-step-loader-wrapper";
import { MagicButton } from "../renderer/src/components/common/MagicButton";

// Example 1: Using the hook for programmatic control
export function HookExample() {
  const { isLoading, startLoading, stopLoading, MultiStepLoaderComponent } = useMultiStepLoader();

  const handleFileUpload = () => {
    startLoading(COMMON_LOADING_STATES.FILE_UPLOAD, {
      duration: 1500,
      loop: false,
      onComplete: () => {
        console.log("File upload completed!");
      },
    });
  };

  const handleDriveCreate = () => {
    startLoading(COMMON_LOADING_STATES.DRIVE_CREATE, {
      duration: 2000,
      loop: false,
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">Hook Example</h3>
      
      <div className="flex gap-4">
        <MagicButton onClick={handleFileUpload} disabled={isLoading}>
          Upload File
        </MagicButton>
        
        <MagicButton onClick={handleDriveCreate} disabled={isLoading}>
          Create Drive
        </MagicButton>
        
        {isLoading && (
          <MagicButton onClick={stopLoading}>
            Stop Loading
          </MagicButton>
        )}
      </div>

      <MultiStepLoaderComponent />
    </div>
  );
}

// Example 2: Using the wrapper component
export function WrapperExample() {
  const [loading, setLoading] = useState(false);

  const customStates = [
    { text: "Initializing..." },
    { text: "Loading data..." },
    { text: "Processing..." },
    { text: "Almost done..." },
    { text: "Complete!" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">Wrapper Example</h3>
      
      <MagicButton onClick={() => setLoading(true)} disabled={loading}>
        Start Custom Loading
      </MagicButton>

      <MultiStepLoaderWrapper
        loadingStates={customStates}
        loading={loading}
        onStop={() => setLoading(false)}
        showStopButton={true}
        stopButtonPosition="top-right"
        duration={1000}
        loop={false}
      />
    </div>
  );
}

// Example 3: Different loading scenarios
export function ScenariosExample() {
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const scenarios = {
    sync: {
      states: COMMON_LOADING_STATES.SYNC,
      duration: 1500,
    },
    saving: {
      states: COMMON_LOADING_STATES.SAVING,
      duration: 1000,
    },
    connecting: {
      states: COMMON_LOADING_STATES.CONNECTING,
      duration: 2000,
    },
    deleting: {
      states: COMMON_LOADING_STATES.DRIVE_DELETE,
      duration: 2500,
    },
  };

  const handleScenario = (scenario: keyof typeof scenarios) => {
    setCurrentScenario(scenario);
    setLoading(true);
    
    // Auto-stop after completion
    setTimeout(() => {
      setLoading(false);
      setCurrentScenario(null);
    }, scenarios[scenario].states.length * scenarios[scenario].duration);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">Loading Scenarios</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <MagicButton 
          onClick={() => handleScenario('sync')} 
          disabled={loading}
        >
          Sync Data
        </MagicButton>
        
        <MagicButton 
          onClick={() => handleScenario('saving')} 
          disabled={loading}
        >
          Save Changes
        </MagicButton>
        
        <MagicButton 
          onClick={() => handleScenario('connecting')} 
          disabled={loading}
        >
          Connect
        </MagicButton>
        
        <MagicButton 
          onClick={() => handleScenario('deleting')} 
          disabled={loading}
        >
          Delete Drive
        </MagicButton>
      </div>

      {currentScenario && (
        <MultiStepLoaderWrapper
          loadingStates={scenarios[currentScenario as keyof typeof scenarios].states}
          loading={loading}
          onStop={() => {
            setLoading(false);
            setCurrentScenario(null);
          }}
          duration={scenarios[currentScenario as keyof typeof scenarios].duration}
          loop={false}
        />
      )}
    </div>
  );
}

// Example 4: Integration with existing modals
export function ModalIntegrationExample() {
  const { isLoading, startLoading, stopLoading, MultiStepLoaderComponent } = useMultiStepLoader();

  const handleComplexOperation = () => {
    startLoading([
      { text: "Preparing operation..." },
      { text: "Validating permissions..." },
      { text: "Processing request..." },
      { text: "Updating database..." },
      { text: "Sending notifications..." },
      { text: "Operation complete!" },
    ], {
      duration: 1200,
      loop: false,
      onComplete: () => {
        // This could trigger a success modal
        console.log("Operation completed successfully!");
      },
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">Modal Integration</h3>
      
      <MagicButton onClick={handleComplexOperation} disabled={isLoading}>
        Run Complex Operation
      </MagicButton>

      <MultiStepLoaderComponent />
    </div>
  );
}

// Main examples component
export function MultiStepLoaderExamples() {
  return (
    <div className="min-h-screen bg-black p-8 space-y-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Multi-Step Loader Examples
        </h1>
        
        <div className="space-y-12">
          <HookExample />
          <WrapperExample />
          <ScenariosExample />
          <ModalIntegrationExample />
        </div>
      </div>
    </div>
  );
}
