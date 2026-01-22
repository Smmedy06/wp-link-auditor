import React, { useState, useEffect } from 'react';

interface DebugLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);

  useEffect(() => {
    // Intercept console.log, console.warn, console.error
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (level: 'info' | 'warn' | 'error', ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev.slice(-99), {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        data: args.length > 1 ? args : undefined,
      }]);
    };

    console.log = (...args: any[]) => {
      originalLog(...args);
      if (args[0]?.includes?.('[Link') || args[0]?.includes?.('[Dashboard]') || args[0]?.includes?.('[LinksView]')) {
        addLog('info', ...args);
      }
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      addLog('warn', ...args);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      addLog('error', ...args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#2271b1',
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '4px',
          cursor: 'pointer',
          zIndex: 9999,
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        🐛 Debug ({logs.length})
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '600px',
        maxHeight: '500px',
        background: 'white',
        border: '2px solid #2271b1',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          background: '#2271b1',
          color: 'white',
          padding: '10px 15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
          Debug Panel ({logs.length} logs)
        </h3>
        <div>
          <button
            onClick={() => setLogs([])}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              marginRight: '8px',
              fontSize: '11px',
            }}
          >
            Clear
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            ✕
          </button>
        </div>
      </div>
      <div
        style={{
          overflowY: 'auto',
          padding: '10px',
          fontSize: '11px',
          fontFamily: 'monospace',
          maxHeight: '450px',
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: '#646970', textAlign: 'center', padding: '20px' }}>
            No debug logs yet. Open browser console to see all logs.
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              style={{
                marginBottom: '8px',
                padding: '6px',
                background: log.level === 'error' ? '#fcf0f1' : log.level === 'warn' ? '#fcf9e8' : '#f0f6fc',
                borderLeft: `3px solid ${
                  log.level === 'error' ? '#d63638' : log.level === 'warn' ? '#dba617' : '#2271b1'
                }`,
                borderRadius: '2px',
              }}
            >
              <div style={{ color: '#646970', fontSize: '10px', marginBottom: '2px' }}>
                [{log.timestamp}] {log.level.toUpperCase()}
              </div>
              <div style={{ color: '#1d2327', wordBreak: 'break-word' }}>
                {log.message}
              </div>
              {log.data && (
                <details style={{ marginTop: '4px' }}>
                  <summary style={{ cursor: 'pointer', color: '#2271b1', fontSize: '10px' }}>
                    Show data
                  </summary>
                  <pre style={{ marginTop: '4px', fontSize: '10px', overflow: 'auto' }}>
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

