"use client";
import { useState, useCallback } from "react";
import { MultiStepLoader } from "./multi-step-loader";

export interface LoadingState {
  text: string;
}

export interface MultiStepLoaderOptions {
  duration?: number;
  loop?: boolean;
  onComplete?: () => void;
  onStepChange?: (step: number) => void;
}

export function useMultiStepLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState<LoadingState[]>([]);
  const [options, setOptions] = useState<MultiStepLoaderOptions>({
    duration: 2000,
    loop: true,
  });

  const startLoading = useCallback((
    states: LoadingState[],
    loaderOptions?: MultiStepLoaderOptions
  ) => {
    setLoadingStates(states);
    setOptions(prev => ({ ...prev, ...loaderOptions }));
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const resetLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingStates([]);
  }, []);

  const MultiStepLoaderComponent = () => (
    <MultiStepLoader
      loadingStates={loadingStates}
      loading={isLoading}
      duration={options.duration}
      loop={options.loop}
    />
  );

  return {
    isLoading,
    startLoading,
    stopLoading,
    resetLoading,
    MultiStepLoaderComponent,
  };
}

// Predefined loading states for common operations
export const COMMON_LOADING_STATES = {
  // File operations
  FILE_UPLOAD: [
    { text: "Preparing file..." },
    { text: "Validating file format..." },
    { text: "Compressing data..." },
    { text: "Uploading to server..." },
    { text: "Processing file..." },
    { text: "Generating preview..." },
    { text: "Saving to drive..." },
    { text: "Upload complete!" },
  ],
  
  // Drive operations
  DRIVE_CREATE: [
    { text: "Initializing drive..." },
    { text: "Setting up permissions..." },
    { text: "Creating directory structure..." },
    { text: "Configuring security..." },
    { text: "Generating access keys..." },
    { text: "Setting up sync..." },
    { text: "Drive ready!" },
  ],
  
  DRIVE_DELETE: [
    { text: "Preparing for deletion..." },
    { text: "Backing up data..." },
    { text: "Removing files..." },
    { text: "Clearing permissions..." },
    { text: "Deleting drive..." },
    { text: "Cleanup complete!" },
  ],
  
  // Sync operations
  SYNC: [
    { text: "Checking for changes..." },
    { text: "Comparing files..." },
    { text: "Downloading updates..." },
    { text: "Uploading changes..." },
    { text: "Merging conflicts..." },
    { text: "Updating metadata..." },
    { text: "Sync complete!" },
  ],
  
  // General operations
  SAVING: [
    { text: "Saving changes..." },
    { text: "Validating data..." },
    { text: "Updating database..." },
    { text: "Saving complete!" },
  ],
  
  LOADING: [
    { text: "Loading data..." },
    { text: "Processing information..." },
    { text: "Preparing interface..." },
    { text: "Ready!" },
  ],
  
  // Network operations
  CONNECTING: [
    { text: "Establishing connection..." },
    { text: "Authenticating..." },
    { text: "Syncing data..." },
    { text: "Connected!" },
  ],
} as const;
