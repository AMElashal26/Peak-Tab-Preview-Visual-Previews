/**
 * Background service worker for Tab Splitter extension
 * Handles window management and tab operations
 */

/**
 * Split current window into two side-by-side windows
 * @param {number} leftTabId - ID of the tab to place in left window
 * @param {number} rightTabId - ID of the tab to place in right window
 */
async function splitWindow(leftTabId, rightTabId) {
  try {
    // Validate input parameters
    if (!leftTabId || !rightTabId || typeof leftTabId !== 'number' || typeof rightTabId !== 'number') {
      return { success: false, error: 'Invalid tab IDs provided' };
    }
    
    if (leftTabId === rightTabId) {
      return { success: false, error: 'Cannot split the same tab' };
    }
    
    // Get current window information
    const currentWindow = await chrome.windows.getCurrent({ populate: true });
    const { width, height, left, top } = currentWindow;
    
    // Validate window dimensions
    if (width < 400 || height < 300) {
      return { success: false, error: 'Window too small to split effectively' };
    }
    
    // Verify tabs exist and are accessible
    try {
      const leftTab = await chrome.tabs.get(leftTabId);
      const rightTab = await chrome.tabs.get(rightTabId);
      
      if (!leftTab || !rightTab) {
        return { success: false, error: 'One or both tabs not found' };
      }
      
      console.log('Tab validation successful:', { leftTabId, rightTabId, leftTab: leftTab.title, rightTab: rightTab.title });
    } catch (error) {
      console.error('Tab validation failed:', error);
      return { success: false, error: 'Invalid tab IDs or tabs not accessible' };
    }
    
    // Calculate dimensions for split windows
    const halfWidth = Math.floor(width / 2);
    
    const leftWindowBounds = {
      left: left,
      top: top,
      width: halfWidth,
      height: height
    };
    
    const rightWindowBounds = {
      left: left + halfWidth,
      top: top,
      width: halfWidth,
      height: height
    };
    
    // Create left window with first tab
    const leftWindow = await chrome.windows.create({
      tabId: leftTabId,
      ...leftWindowBounds,
      focused: true
    });
    
    // Create right window with second tab
    const rightWindow = await chrome.windows.create({
      tabId: rightTabId,
      ...rightWindowBounds,
      focused: false
    });
    
    // Verify both windows were created successfully
    if (!leftWindow || !rightWindow) {
      throw new Error('Failed to create one or both windows');
    }
    
    // Close the original window if it's empty or has only one tab
    const originalTabs = currentWindow.tabs || [];
    if (originalTabs.length <= 2) {
      await chrome.windows.remove(currentWindow.id);
    }
    
    return { success: true, leftWindow: leftWindow.id, rightWindow: rightWindow.id };
    
  } catch (error) {
    console.error('Error splitting window:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all tabs in current window
 * @returns {Promise<Array>} Array of tab objects
 */
async function getCurrentWindowTabs() {
  try {
    const currentWindow = await chrome.windows.getCurrent({ populate: true });
    return currentWindow.tabs || [];
  } catch (error) {
    console.error('Error getting current window tabs:', error);
    return [];
  }
}

/**
 * Get tab information by ID
 * @param {number} tabId - Tab ID
 * @returns {Promise<Object>} Tab object
 */
async function getTabInfo(tabId) {
  try {
    return await chrome.tabs.get(tabId);
  } catch (error) {
    console.error('Error getting tab info:', error);
    return null;
  }
}

// Message handling from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'getCurrentWindowTabs':
          const currentTabs = await getCurrentWindowTabs();
          sendResponse({ success: true, data: currentTabs });
          break;
          
        case 'splitWindow':
          const result = await splitWindow(request.leftTabId, request.rightTabId);
          sendResponse(result);
          break;
          
        case 'getTabInfo':
          const tabInfo = await getTabInfo(request.tabId);
          sendResponse({ success: true, data: tabInfo });
          break;
          
        case 'quickSplit':
          const quickSplitTabs = await getCurrentWindowTabs();
          if (quickSplitTabs.length >= 2) {
            const currentIndex = quickSplitTabs.findIndex(tab => tab.active);
            const leftTab = quickSplitTabs[currentIndex];
            const rightTab = quickSplitTabs[currentIndex + 1] || quickSplitTabs[0];
            const result = await splitWindow(leftTab.id, rightTab.id);
            sendResponse(result);
          } else {
            sendResponse({ success: false, error: 'Need at least 2 tabs to split' });
          }
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  // Return true to indicate we will send a response asynchronously
  return true;
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Tab Splitter extension installed');
  }
});
