
import { useState, useCallback, useEffect, useRef } from 'react';
import { LogEntry, Toast } from '../types';
import { AssetStore } from '../services/assetStore';
import { StorageService } from '../services/storageService';
import { getTimestampName } from '../services/utils';

export const useSystem = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showLogsOverlay, setShowLogsOverlay] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Track recently used refs to handle rapid bursts of logging within the same render cycle
  // or before state updates propagate, ensuring uniqueness.
  const usedRefs = useRef<Set<string>>(new Set());

  // Load Logs Meta on Mount
  useEffect(() => {
    const loadLogs = async () => {
        const meta = StorageService.getLogsMeta();
        setLogs(meta);
        setIsInitialized(true);
    };
    loadLogs();
  }, []);

  // Persist Logs on Change
  useEffect(() => {
    if (isInitialized) {
        StorageService.saveLogsMeta(logs);
    }
  }, [logs, isInitialized]);

  const addLog = useCallback(async (message: string, level: LogEntry['level'] = 'info', rawData?: any) => {
    let serializedRaw: string | undefined = undefined;
    
    try {
        if (rawData instanceof Error) {
            serializedRaw = JSON.stringify({
                message: rawData.message,
                name: rawData.name,
                stack: rawData.stack,
                ...(typeof rawData === 'object' ? rawData : {})
            }, null, 2);
        } else if (typeof rawData === 'object' && rawData !== null) {
            serializedRaw = JSON.stringify(rawData, null, 2);
        } else if (rawData !== undefined) {
            serializedRaw = String(rawData);
        }
    } catch (e) {
        serializedRaw = `[Serialization Error]: ${String(e)}`;
    }

    const id = crypto.randomUUID();
    let rawDataRef: string | undefined = undefined;

    // If we have heavy raw data, save to IDB and use ref
    if (serializedRaw) {
        // Generate base name: log_YYYYMMDD_HHMMSS.json
        const baseName = getTimestampName("log", "json");
        let finalRef = baseName;

        // Check if ref is taken in current state OR recently used in this burst
        const isTaken = (ref: string) => {
             return logs.some(l => l.rawDataRef === ref) || usedRefs.current.has(ref);
        };

        // Collision Resolution: Append (N) if taken
        if (isTaken(finalRef)) {
            const namePart = baseName.replace(/\.json$/i, '');
            const extPart = ".json";
            let counter = 1;
            while (true) {
                const candidate = `${namePart} (${counter})${extPart}`;
                if (!isTaken(candidate)) {
                    finalRef = candidate;
                    break;
                }
                counter++;
            }
        }

        rawDataRef = finalRef;
        usedRefs.current.add(rawDataRef);

        // Save async to IDB (fire and forget mostly, but we want it stored)
        const blob = new Blob([serializedRaw], { type: 'application/json' });
        AssetStore.saveAsset(rawDataRef, blob).catch(e => console.error("Failed to save log data", e));
    }

    setLogs(prev => [{
      id,
      timestamp: Date.now(),
      level,
      message,
      rawData: serializedRaw, // Keep in memory for immediate view
      rawDataRef
    }, ...prev]);
  }, [logs]); // Depends on logs for collision check

  // Modified: addToast now accepts rawData and automatically calls addLog
  const addToast = useCallback((message: string, level: Toast['level'] = 'info', rawData?: any) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, level }]);
    
    // Auto-logging integration
    addLog(message, level, rawData);
  }, [addLog]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearLogs = useCallback(async () => {
    const meta = StorageService.getLogsMeta();
    for (const log of meta) {
        if (log.rawDataRef) {
            await AssetStore.deleteAsset(log.rawDataRef);
        }
    }
    
    usedRefs.current.clear();
    setLogs([]);
    StorageService.saveLogsMeta([]);
  }, []);

  return {
    logs,
    toasts,
    showLogsOverlay,
    setShowLogsOverlay,
    addLog,
    addToast,
    removeToast,
    clearLogs
  };
};
