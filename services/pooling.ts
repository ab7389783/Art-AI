
import { API_CONCURRENCY_LIMIT } from "./apiClient";

export const executeWithPooling = async <T>(
  performRequest: () => Promise<T>,
  getMaxRetries: () => number,
  onStatusUpdate: ((status: string) => void) | undefined,
  onBackgroundSuccess: ((result: T) => void) | undefined,
  signal: AbortSignal | undefined,
  onError: ((error: any, attempt: number) => void) | undefined,
  statusPrefix: string = "Generating..."
): Promise<T> => {
    return new Promise((resolve, reject) => {
        let requestsLaunched = 0;
        let requestsCompleted = 0;
        let activeCount = 0;
        let isResolved = false;
        let lastError: any = new Error("Initialization Error");

        // --- IMMEDIATE CANCELLATION HANDLING ---
        // If the user clicks cancel, we must reject the main promise immediately.
        // Otherwise, if the API call hangs (zombie), the UI remains stuck even after cancellation.
        if (signal) {
            if (signal.aborted) {
                isResolved = true;
                reject(new Error("Operation Cancelled"));
                return;
            }
            signal.addEventListener('abort', () => {
                if (!isResolved) {
                    isResolved = true;
                    // Silent reject
                    reject(new Error("Operation Cancelled"));
                }
            });
        }

        const updateStatus = () => {
             if (onStatusUpdate && !isResolved) {
                 const max = getMaxRetries();
                 const current = Math.min(requestsCompleted + 1, max);
                 onStatusUpdate(`${statusPrefix} (Attempt ${current}/${max})`);
             }
        };

        const checkAndLaunch = () => {
            // Stop launching new requests if already resolved or aborted
            if (isResolved || signal?.aborted) return;
            
            const max = getMaxRetries();
            // Rule: 1 concurrent request initially. If that fails, allowed up to limit.
            const concurrencyLimit = (requestsCompleted === 0) ? 1 : API_CONCURRENCY_LIMIT;

            while (activeCount < concurrencyLimit && requestsLaunched < max) {
                 if (signal?.aborted) break;
                 if (isResolved) break;

                 requestsLaunched++;
                 activeCount++;
                 
                 const currentAttempt = requestsLaunched; // Capture attempt number for this specific request
                 if (requestsLaunched === 1) updateStatus();

                 performRequest()
                    .then(result => {
                        if (signal?.aborted) return;
                        
                        if (!isResolved) {
                            isResolved = true;
                            resolve(result);
                        } else {
                            // If main promise already resolved, this is a background success (race condition winner #2)
                            if (onBackgroundSuccess) onBackgroundSuccess(result);
                        }
                    })
                    .catch(err => {
                        lastError = err;
                        
                        // Trigger onError (Toast) for individual attempt failures
                        if (onError && !isResolved && !signal?.aborted) {
                             onError(err, currentAttempt);
                        }
                    })
                    .finally(() => {
                        activeCount--;
                        requestsCompleted++;
                        
                        // Only continue pooling logic if we haven't succeeded yet (and haven't been aborted)
                        if (!isResolved && !signal?.aborted) {
                            updateStatus();
                            checkAndLaunch(); // replenish pool

                            // Global failure: No active requests left and we hit max retries
                            if (activeCount === 0 && requestsLaunched >= getMaxRetries()) {
                                 const msg = lastError?.message || "Unknown Error";
                                 if (msg === "Operation Cancelled") {
                                     reject(new Error("Operation Cancelled"));
                                 } else {
                                     // Reject with the last error encountered
                                     reject(lastError || new Error("Max retries exceeded"));
                                 }
                            }
                        }
                    });
            }
        };

        checkAndLaunch();
    });
};
