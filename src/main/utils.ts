/**
 * Utility functions for the main process
 */

/**
 * Check if the application is running in development mode
 * @returns {boolean} True if running in development mode
 */
export const isDevelopmentMode = (): boolean => {
  // Check multiple indicators for development mode
  return (
    process.argv.includes('--dev') ||
    process.defaultApp ||
    /electron/i.test(process.argv[0]) ||
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  );
};
