
import React, { useState } from 'react';
import { LogEntry } from '../types';
import { LinkifiedText } from './LinkifiedText';
import { ConfirmationModal } from './ConfirmationModal';
import { AssetStore } from '../services/assetStore';

interface LogOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  logs: LogEntry[];
  onClear: () => void;
}

const LogItem: React.FC<{ log: LogEntry }> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rawDataContent, setRawDataContent] = useState<string | null>(log.rawData || null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if we have raw data in memory OR a reference to fetch it
  const hasRawData = !!log.rawData || !!log.rawDataRef;

  const handleToggleExpand = async () => {
      if (isExpanded) {
          setIsExpanded(false);
          return;
      }

      // If we need to load data and haven't yet
      if (!rawDataContent && log.rawDataRef) {
          setIsLoading(true);
          try {
              const blob = await AssetStore.getAsset(log.rawDataRef);
              if (blob) {
                  const text = await blob.text();
                  setRawDataContent(text);
              } else {
                  setRawDataContent("[Data Not Found in Storage]");
              }
          } catch (e) {
              setRawDataContent(`[Error Loading Data]: ${String(e)}`);
          } finally {
              setIsLoading(false);
          }
      }

      setIsExpanded(true);
  };

  return (
    <div className={`p-3 rounded-sm border-l-2 bg-black/40 ${
      log.level === 'error' ? 'border-red-500' :
      log.level === 'warning' ? 'border-orange-500' :
      log.level === 'success' ? 'border-green-500' :
      log.level === 'info' ? 'border-blue-500' :
      'border-zinc-700'
    }`}>
      <div className="flex justify-between items-start mb-2 opacity-50 text-[8px]">
          <div className="flex gap-2">
            <span className={`px-1 rounded uppercase font-bold ${
                log.level === 'error' ? 'bg-red-950 text-red-400' : 
                log.level === 'warning' ? 'bg-orange-950 text-orange-400' : 
                log.level === 'success' ? 'bg-green-950 text-green-400' :
                log.level === 'info' ? 'bg-blue-950 text-blue-400' :
                'bg-zinc-800 text-zinc-400'
            }`}>{log.level}</span>
            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
          </div>
          {hasRawData && (
            <button 
              onClick={handleToggleExpand}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 rounded hover:bg-white/5"
              title={isExpanded ? 'Collapse' : 'View Details'}
            >
              {isExpanded ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          )}
      </div>
      
      {/* Main Message */}
      <div className="text-zinc-300 font-bold mb-1 tracking-tight break-words whitespace-pre-wrap leading-relaxed">
        <LinkifiedText text={log.message} />
      </div>
      
      {/* Detailed Raw Data */}
      {isExpanded && (
        <div className="mt-3 pt-2 border-t border-zinc-800/50 animate-in slide-in-from-top-2 duration-200">
            {isLoading ? (
                <div className="flex items-center gap-2 text-zinc-500 text-[9px]">
                    <span className="w-3 h-3 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin"></span>
                    Loading data...
                </div>
            ) : (
                <pre className="text-[8px] text-zinc-400 overflow-x-auto custom-scrollbar p-3 bg-black/50 rounded border border-zinc-800/50">
                    {rawDataContent}
                </pre>
            )}
        </div>
      )}
    </div>
  );
};

export const LogOverlay: React.FC<LogOverlayProps> = ({ isVisible, onClose, logs, onClear }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isVisible) return null;

  return (
    <>
        <ConfirmationModal 
            isOpen={showConfirm}
            title="Clear Logs"
            message="Are you sure you want to clear all system logs? This action cannot be undone."
            confirmLabel="Clear"
            isDanger={true}
            onConfirm={() => { onClear(); setShowConfirm(false); }}
            onCancel={() => setShowConfirm(false)}
        />

        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
            <div className="w-full h-full max-w-3xl mx-auto flex flex-col bg-zinc-950/50">
                {/* Header */}
                <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950 shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-sm font-bold tracking-widest text-white">System Logs</h2>
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700 whitespace-nowrap min-w-fit">
                        {logs.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {logs.length > 0 && (
                        <button 
                            onClick={() => setShowConfirm(true)}
                            className="text-[10px] text-red-500 hover:text-red-400 px-3 py-1 bg-red-950/20 border border-red-900/50 rounded font-bold mr-2 transition-colors hover:bg-red-900/40"
                        >
                            Clear
                        </button>
                        )}
                        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 font-mono text-[9px] space-y-3 custom-scrollbar">
                    {logs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4 opacity-50">
                            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            <p className="text-sm font-bold tracking-widest">Logs Empty</p>
                        </div>
                    ) : (
                        logs.map(log => <LogItem key={log.id} log={log} />)
                    )}
                </div>
            </div>
        </div>
    </>
  );
};
