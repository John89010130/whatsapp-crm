import { useEffect, useState } from 'react';

export const Popup = () => {
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    // Check connection status
    chrome.storage.local.get(['isConnected'], (result) => {
      setIsConnected(result.isConnected || false);
    });
  }, []);
  
  return (
    <div style={{ width: '300px', padding: '20px' }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>WhatsApp CRM</h2>
      
      <div style={{ marginBottom: '15px' }}>
        <div style={{ 
          padding: '10px', 
          borderRadius: '5px', 
          background: isConnected ? '#dcf8c6' : '#fee',
          textAlign: 'center'
        }}>
          {isConnected ? '✓ Conectado' : '✗ Desconectado'}
        </div>
      </div>
      
      <button
        style={{
          width: '100%',
          padding: '10px',
          background: '#25D366',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
        onClick={() => window.open('http://localhost:5173', '_blank')}
      >
        Abrir Dashboard
      </button>
      
      <p style={{ 
        marginTop: '15px', 
        fontSize: '12px', 
        color: '#666', 
        textAlign: 'center' 
      }}>
        v1.0.0
      </p>
    </div>
  );
};
