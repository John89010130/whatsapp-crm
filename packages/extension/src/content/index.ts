// Content script - injected into WhatsApp Web
console.log('WhatsApp CRM content script loaded');

// Inject sidebar
const injectSidebar = () => {
  const sidebar = document.createElement('div');
  sidebar.id = 'whatsapp-crm-sidebar';
  sidebar.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    background: white;
    box-shadow: -2px 0 10px rgba(0,0,0,0.1);
    z-index: 99999;
    transform: translateX(400px);
    transition: transform 0.3s ease;
  `;
  
  sidebar.innerHTML = `
    <div style="padding: 20px;">
      <h2 style="margin: 0 0 20px 0;">WhatsApp CRM</h2>
      <button id="crm-toggle" style="padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 5px; cursor: pointer;">
        Toggle Sidebar
      </button>
    </div>
  `;
  
  document.body.appendChild(sidebar);
  
  // Toggle button
  const toggleBtn = document.getElementById('crm-toggle');
  let isOpen = false;
  
  toggleBtn?.addEventListener('click', () => {
    isOpen = !isOpen;
    sidebar.style.transform = isOpen ? 'translateX(0)' : 'translateX(400px)';
  });
};

// Wait for WhatsApp Web to load
const waitForWhatsApp = () => {
  const checkInterval = setInterval(() => {
    if (document.querySelector('[data-testid="conversation-panel-wrapper"]')) {
      clearInterval(checkInterval);
      injectSidebar();
      observeMessages();
    }
  }, 1000);
};

// Observe new messages
const observeMessages = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          const element = node as Element;
          if (element.matches('[data-testid*="msg"]')) {
            // New message detected
            chrome.runtime.sendMessage({
              type: 'NEW_MESSAGE',
              payload: {
                text: element.textContent,
                timestamp: new Date().toISOString()
              }
            });
          }
        }
      });
    });
  });
  
  const chatContainer = document.querySelector('[data-testid="conversation-panel-wrapper"]');
  if (chatContainer) {
    observer.observe(chatContainer, {
      childList: true,
      subtree: true
    });
  }
};

// Initialize
waitForWhatsApp();

export {};
