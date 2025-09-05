/**
 * Background service worker for Tab Splitter extension
 * Handles window management and tab operations
 */

// Track reference windows
const referenceWindows = new Set();

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

/**
 * Create a reference window for a tab
 * @param {number} tabId - ID of the tab to place in reference window
 * @returns {Promise<Object>} Result object with success status and window ID
 */
async function createReferenceWindow(tabId) {
  try {
    // Validate input
    if (!tabId || typeof tabId !== 'number') {
      return { success: false, error: 'Invalid tab ID provided' };
    }

    // Check if we've reached the maximum number of reference windows
    if (referenceWindows.size >= 3) {
      return { success: false, error: 'Maximum of 3 reference windows allowed' };
    }

    // Verify tab exists
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab) {
        return { success: false, error: 'Tab not found' };
      }
    } catch (error) {
      return { success: false, error: 'Tab not accessible' };
    }

    // Get current window information
    const currentWindow = await chrome.windows.getCurrent({ populate: true });
    const { width, height, left, top } = currentWindow;

    // Calculate reference window dimensions (20% width, full height)
    const referenceWidth = Math.floor(width * 0.2);
    const referenceHeight = height;

    // Calculate reference window position (at right edge of current window)
    const referenceLeft = left + width;
    const referenceTop = top;

    // Create reference window
    const referenceWindow = await chrome.windows.create({
      tabId: tabId,
      left: referenceLeft,
      top: referenceTop,
      width: referenceWidth,
      height: referenceHeight,
      focused: false,
      type: 'normal'
    });

    // Track the reference window
    referenceWindows.add(referenceWindow.id);

    console.log('Reference window created:', {
      windowId: referenceWindow.id,
      tabId: tabId,
      dimensions: { width: referenceWidth, height: referenceHeight },
      position: { left: referenceLeft, top: referenceTop }
    });

    return { 
      success: true, 
      windowId: referenceWindow.id,
      tabId: tabId,
      dimensions: { width: referenceWidth, height: referenceHeight }
    };

  } catch (error) {
    console.error('Error creating reference window:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Close a specific reference window
 * @param {number} windowId - ID of the reference window to close
 * @returns {Promise<Object>} Result object with success status
 */
async function closeReferenceWindow(windowId) {
  try {
    if (!referenceWindows.has(windowId)) {
      return { success: false, error: 'Window is not a tracked reference window' };
    }

    await chrome.windows.remove(windowId);
    referenceWindows.delete(windowId);

    console.log('Reference window closed:', windowId);
    return { success: true, windowId: windowId };

  } catch (error) {
    console.error('Error closing reference window:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Close all reference windows
 * @returns {Promise<Object>} Result object with success status
 */
async function closeAllReferenceWindows() {
  try {
    const closePromises = Array.from(referenceWindows).map(windowId => 
      chrome.windows.remove(windowId).catch(error => {
        console.error(`Error closing reference window ${windowId}:`, error);
        return null;
      })
    );

    await Promise.all(closePromises);
    const closedCount = referenceWindows.size;
    referenceWindows.clear();

    console.log('All reference windows closed:', closedCount);
    return { success: true, closedCount: closedCount };

  } catch (error) {
    console.error('Error closing all reference windows:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get list of current reference windows
 * @returns {Object} Object with reference window information
 */
function getReferenceWindows() {
  return {
    success: true,
    windows: Array.from(referenceWindows),
    count: referenceWindows.size
  };
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
          
        case 'createReferenceWindow':
          const referenceResult = await createReferenceWindow(request.tabId);
          sendResponse(referenceResult);
          break;
          
        case 'closeReferenceWindow':
          const closeResult = await closeReferenceWindow(request.windowId);
          sendResponse(closeResult);
          break;
          
        case 'closeAllReferenceWindows':
          const closeAllResult = await closeAllReferenceWindows();
          sendResponse(closeAllResult);
          break;
          
        case 'getReferenceWindows':
          const refWindows = getReferenceWindows();
          sendResponse(refWindows);
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

// Handle window close events to clean up reference windows
chrome.windows.onRemoved.addListener((windowId) => {
  if (referenceWindows.has(windowId)) {
    referenceWindows.delete(windowId);
    console.log('Reference window closed and removed from tracking:', windowId);
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Tab Splitter extension installed');
  }
});
