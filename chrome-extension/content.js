/**
 * Content script for Tab Splitter extension
 * Provides enhanced tab interaction capabilities
 */

/**
 * Initialize content script
 */
function initContentScript() {
  // Add keyboard shortcut for quick split (Ctrl+Shift+S)
  document.addEventListener('keydown', handleKeyboardShortcut);
  
  // Add visual indicators for split-able tabs
  addSplitIndicators();
}

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyboardShortcut(event) {
  // Ctrl+Shift+S for quick split
  if (event.ctrlKey && event.shiftKey && event.key === 'S') {
    event.preventDefault();
    requestQuickSplit();
  }
}

/**
 * Request quick split from background script
 */
async function requestQuickSplit() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'quickSplit',
      source: 'content'
    });
    
    if (response && response.success) {
      showNotification('Windows split successfully!', 'success');
    } else {
      showNotification('Failed to split windows: ' + (response?.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Error requesting quick split:', error);
    showNotification('Error: ' + error.message, 'error');
  }
}

/**
 * Add visual indicators for tabs that can be split
 */
function addSplitIndicators() {
  // This would add visual cues to tabs, but since we can't modify
  // the browser's native tab bar, we'll focus on the popup interface
  console.log('Content script loaded - keyboard shortcuts available');
}

/**
 * Show notification to user
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `tab-splitter-notification ${type}`;
  notification.textContent = message;
  
  // Style the notification
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 16px',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: '10000',
    maxWidth: '300px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.3s ease'
  });
  
  // Set background color based on type
  switch (type) {
    case 'success':
      notification.style.background = '#34a853';
      break;
    case 'error':
      notification.style.background = '#ea4335';
      break;
    case 'info':
    default:
      notification.style.background = '#1a73e8';
      break;
  }
  
  // Add to page
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'showNotification':
      showNotification(request.message, request.type);
      sendResponse({ success: true });
      break;
      
    case 'getPageInfo':
      sendResponse({
        success: true,
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname
      });
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  return true;
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}
