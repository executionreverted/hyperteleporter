// Download performance configuration
export interface DownloadConfig {
  // Parallel download settings
  concurrentDownloads: number
  batchSize: number
  
  // Progress reporting
  progressBatchInterval: number // ms
  
  // Prefetching settings
  prefetchBatchSize: number
  enablePrefetching: boolean
  
  // Streaming settings
  enableStreaming: boolean
  streamTimeout: number // ms
  
  // Retry settings
  maxRetries: number
  retryDelay: number // ms
}

export const DEFAULT_DOWNLOAD_CONFIG: DownloadConfig = {
  // Parallel download settings
  concurrentDownloads: 5, // Number of files to download simultaneously
  batchSize: 5, // Files per batch
  
  // Progress reporting
  progressBatchInterval: 100, // Batch progress updates every 100ms
  
  // Prefetching settings
  prefetchBatchSize: 3, // Number of files to prefetch ahead
  enablePrefetching: true,
  
  // Streaming settings
  enableStreaming: true,
  streamTimeout: 30000, // 30 seconds
  
  // Retry settings
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay
}

// Get download config with environment overrides
export function getDownloadConfig(): DownloadConfig {
  const config = { ...DEFAULT_DOWNLOAD_CONFIG }
  
  // Allow environment variable overrides
  if (process.env.DOWNLOAD_CONCURRENT) {
    config.concurrentDownloads = parseInt(process.env.DOWNLOAD_CONCURRENT, 10) || config.concurrentDownloads
  }
  
  if (process.env.DOWNLOAD_BATCH_SIZE) {
    config.batchSize = parseInt(process.env.DOWNLOAD_BATCH_SIZE, 10) || config.batchSize
  }
  
  if (process.env.DOWNLOAD_PREFETCH === 'false') {
    config.enablePrefetching = false
  }
  
  if (process.env.DOWNLOAD_STREAMING === 'false') {
    config.enableStreaming = false
  }
  
  return config
}
