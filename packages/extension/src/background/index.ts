// Background service worker
console.log('WhatsApp CRM Extension loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Message received:', message);
  
  if (message.type === 'NEW_MESSAGE') {
    // Send to backend API
    fetch('http://localhost:3000/api/webhooks/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message.payload)
    }).catch(console.error);
  }
  
  sendResponse({ success: true });
  return true;
});

export {};
