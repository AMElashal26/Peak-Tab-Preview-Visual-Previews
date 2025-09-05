/**
 * Popup script for Tab Splitter extension
 * Handles UI interactions and communication with background script
 */

class TabSplitterPopup {
  constructor() {
    this.leftTabSelect = document.getElementById('leftTabSelect');
    this.rightTabSelect = document.getElementById('rightTabSelect');
    this.splitButton = document.getElementById('splitButton');
    this.splitCurrentAndNextBtn = document.getElementById('splitCurrentAndNext');
    this.splitFirstTwoBtn = document.getElementById('splitFirstTwo');
    this.statusMessage = document.getElementById('statusMessage');
    this.referenceWindowsList = document.getElementById('referenceWindowsList');
    this.closeAllReferencesBtn = document.getElementById('closeAllReferences');
    
    this.tabs = [];
    this.referenceWindows = new Map(); // windowId -> { tabId, tabInfo }
    this.isLoading = false;
    
    this.init();
  }

  /**
   * Initialize the popup
   */
  async init() {
    try {
      await this.loadTabs();
      await this.loadReferenceWindows();
      this.setupEventListeners();
      this.updateSplitButtonState();
    } catch (error) {
      this.showStatus('Error loading tabs: ' + error.message, 'error');
    }
  }

  /**
   * Load tabs from current window
   */
  async loadTabs() {
    try {
      const response = await this.sendMessage({ action: 'getCurrentWindowTabs' });
      
      if (response.success) {
        this.tabs = response.data;
        this.populateTabSelects();
      } else {
        throw new Error(response.error || 'Failed to load tabs');
      }
    } catch (error) {
      console.error('Error loading tabs:', error);
      throw error;
    }
  }

  /**
   * Populate tab select dropdowns
   */
  populateTabSelects() {
    // Clear existing options (except the first placeholder)
    this.leftTabSelect.innerHTML = '<option value="">Select a tab...</option>';
    this.rightTabSelect.innerHTML = '<option value="">Select a tab...</option>';

    // Add tabs to both selects
    this.tabs.forEach(tab => {
      const option = document.createElement('option');
      option.value = tab.id;
      option.textContent = this.getTabDisplayName(tab);
      option.title = tab.url;
      
      this.leftTabSelect.appendChild(option.cloneNode(true));
      this.rightTabSelect.appendChild(option);
    });

    // Auto-select current tab for left window
    const currentTab = this.tabs.find(tab => tab.active);
    if (currentTab) {
      this.leftTabSelect.value = currentTab.id;
    }
  }

  /**
   * Load current reference windows
   */
  async loadReferenceWindows() {
    try {
      const response = await this.sendMessage({ action: 'getReferenceWindows' });
      if (response.success) {
        this.referenceWindows.clear();
        // Load tab info for each reference window
        for (const windowId of response.windows) {
          // We'll need to get tab info from the window
          // For now, we'll track the window IDs and update the UI
        }
        this.updateReferenceWindowsList();
      }
    } catch (error) {
      console.error('Error loading reference windows:', error);
    }
  }

  /**
   * Update the reference windows list UI
   */
  updateReferenceWindowsList() {
    if (this.referenceWindows.size === 0) {
      this.referenceWindowsList.innerHTML = '<p class="no-references">No reference windows open</p>';
      this.closeAllReferencesBtn.disabled = true;
    } else {
      this.referenceWindowsList.innerHTML = '';
      this.closeAllReferencesBtn.disabled = false;
      
      this.referenceWindows.forEach((refData, windowId) => {
        const refItem = document.createElement('div');
        refItem.className = 'reference-item';
        refItem.innerHTML = `
          <div class="reference-info">
            <p class="reference-title">${this.getTabDisplayName(refData.tabInfo)}</p>
            <p class="reference-url">${refData.tabInfo.url}</p>
          </div>
          <div class="reference-actions">
            <button class="btn btn-small btn-secondary" data-window-id="${windowId}">
              Close
            </button>
          </div>
        `;
        this.referenceWindowsList.appendChild(refItem);
      });
    }
  }

  /**
   * Get display name for tab
   * @param {Object} tab - Tab object
   * @returns {string} Display name
   */
  getTabDisplayName(tab) {
    const title = tab.title || 'Untitled';
    const maxLength = 40;
    
    if (title.length > maxLength) {
      return title.substring(0, maxLength) + '...';
    }
    
    return title;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Tab selection changes
    this.leftTabSelect.addEventListener('change', () => {
      this.updateSplitButtonState();
      this.validateTabSelection();
    });
    
    this.rightTabSelect.addEventListener('change', () => {
      this.updateSplitButtonState();
      this.validateTabSelection();
    });

    // Split button
    this.splitButton.addEventListener('click', () => {
      this.handleSplit();
    });

    // Quick action buttons
    this.splitCurrentAndNextBtn.addEventListener('click', () => {
      this.handleQuickSplit('currentAndNext');
    });

    this.splitFirstTwoBtn.addEventListener('click', () => {
      this.handleQuickSplit('firstTwo');
    });

    // Reference window buttons
    this.closeAllReferencesBtn.addEventListener('click', () => {
      this.handleCloseAllReferences();
    });

    // Add reference window buttons to each tab option
    this.addReferenceWindowButtons();

    // Add event delegation for reference window close buttons
    this.referenceWindowsList.addEventListener('click', (event) => {
      if (event.target.matches('[data-window-id]')) {
        const windowId = parseInt(event.target.getAttribute('data-window-id'));
        this.handleCloseReference(windowId);
      }
    });
  }

  /**
   * Update split button state based on selection
   */
  updateSplitButtonState() {
    const leftTabId = this.leftTabSelect.value;
    const rightTabId = this.rightTabSelect.value;
    const isValid = leftTabId && rightTabId && leftTabId !== rightTabId;
    
    this.splitButton.disabled = !isValid || this.isLoading;
  }

  /**
   * Validate tab selection and show warnings
   */
  validateTabSelection() {
    const leftTabId = this.leftTabSelect.value;
    const rightTabId = this.rightTabSelect.value;
    
    if (leftTabId && rightTabId && leftTabId === rightTabId) {
      this.showStatus('Please select different tabs for each window', 'error');
    } else {
      this.hideStatus();
    }
  }

  /**
   * Handle quick split actions
   * @param {string} type - Type of quick split
   */
  async handleQuickSplit(type) {
    if (this.tabs.length < 2) {
      this.showStatus('Need at least 2 tabs to split', 'error');
      return;
    }

    try {
      let leftTab, rightTab;

      switch (type) {
        case 'currentAndNext':
          const currentIndex = this.tabs.findIndex(tab => tab.active);
          leftTab = this.tabs[currentIndex];
          rightTab = this.tabs[currentIndex + 1] || this.tabs[0];
          break;
          
        case 'firstTwo':
          leftTab = this.tabs[0];
          rightTab = this.tabs[1];
          break;
      }

      if (leftTab && rightTab) {
        await this.performSplit(leftTab.id, rightTab.id);
      }
    } catch (error) {
      this.showStatus('Error with quick split: ' + error.message, 'error');
    }
  }

  /**
   * Handle manual split
   */
  async handleSplit() {
    const leftTabId = parseInt(this.leftTabSelect.value);
    const rightTabId = parseInt(this.rightTabSelect.value);

    if (isNaN(leftTabId) || isNaN(rightTabId) || !leftTabId || !rightTabId) {
      this.showStatus('Please select tabs for both windows', 'error');
      return;
    }

    if (leftTabId === rightTabId) {
      this.showStatus('Please select different tabs', 'error');
      return;
    }

    await this.performSplit(leftTabId, rightTabId);
  }

  /**
   * Perform the actual split operation
   * @param {number} leftTabId - Left tab ID
   * @param {number} rightTabId - Right tab ID
   */
  async performSplit(leftTabId, rightTabId) {
    if (this.isLoading) return;

    this.setLoading(true);
    this.showStatus('Splitting windows...', 'info');

    try {
      console.log('Attempting to split windows with tab IDs:', { leftTabId, rightTabId });
      const response = await this.sendMessage({
        action: 'splitWindow',
        leftTabId: leftTabId,
        rightTabId: rightTabId
      });

      if (response.success) {
        this.showStatus('Windows split successfully!', 'success');
        // Close popup after successful split
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        throw new Error(response.error || 'Failed to split windows');
      }
    } catch (error) {
      console.error('Error splitting windows:', error);
      this.showStatus('Error: ' + error.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Set loading state
   * @param {boolean} loading - Loading state
   */
  setLoading(loading) {
    this.isLoading = loading;
    this.splitButton.disabled = loading;
    this.splitCurrentAndNextBtn.disabled = loading;
    this.splitFirstTwoBtn.disabled = loading;
    this.closeAllReferencesBtn.disabled = loading;
    
    // Disable reference window buttons
    const refButtons = document.querySelectorAll('.btn-reference');
    refButtons.forEach(btn => btn.disabled = loading);
    
    if (loading) {
      document.body.classList.add('loading');
    } else {
      document.body.classList.remove('loading');
    }
  }

  /**
   * Show status message
   * @param {string} message - Status message
   * @param {string} type - Message type (success, error, info)
   */
  showStatus(message, type = 'info') {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
  }

  /**
   * Hide status message
   */
  hideStatus() {
    this.statusMessage.classList.add('hidden');
  }

  /**
   * Add reference window buttons to tab options
   */
  addReferenceWindowButtons() {
    // Add reference window buttons to the tab selection area
    const tabGroups = document.querySelectorAll('.tab-group');
    tabGroups.forEach(group => {
      const select = group.querySelector('.tab-select');
      const label = group.querySelector('.tab-label');
      
      // Create reference button container
      const refButtonContainer = document.createElement('div');
      refButtonContainer.className = 'reference-button-container';
      refButtonContainer.style.marginTop = '8px';
      
      // Create reference button
      const refButton = document.createElement('button');
      refButton.className = 'btn btn-reference';
      refButton.textContent = 'Open as Reference';
      refButton.style.width = '100%';
      refButton.style.fontSize = '12px';
      
      // Add click handler
      refButton.addEventListener('click', () => {
        const tabId = parseInt(select.value);
        if (tabId && !isNaN(tabId)) {
          this.handleCreateReference(tabId);
        } else {
          this.showStatus('Please select a tab first', 'error');
        }
      });
      
      refButtonContainer.appendChild(refButton);
      group.appendChild(refButtonContainer);
    });
  }

  /**
   * Handle creating a reference window
   * @param {number} tabId - Tab ID to open as reference
   */
  async handleCreateReference(tabId) {
    if (this.isLoading) return;

    this.setLoading(true);
    this.showStatus('Creating reference window...', 'info');

    try {
      const response = await this.sendMessage({
        action: 'createReferenceWindow',
        tabId: tabId
      });

      if (response.success) {
        this.showStatus('Reference window created!', 'success');
        // Reload reference windows list
        await this.loadReferenceWindows();
      } else {
        throw new Error(response.error || 'Failed to create reference window');
      }
    } catch (error) {
      console.error('Error creating reference window:', error);
      this.showStatus('Error: ' + error.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Handle closing a specific reference window
   * @param {number} windowId - Window ID to close
   */
  async handleCloseReference(windowId) {
    try {
      const response = await this.sendMessage({
        action: 'closeReferenceWindow',
        windowId: windowId
      });

      if (response.success) {
        this.showStatus('Reference window closed', 'success');
        await this.loadReferenceWindows();
      } else {
        throw new Error(response.error || 'Failed to close reference window');
      }
    } catch (error) {
      console.error('Error closing reference window:', error);
      this.showStatus('Error: ' + error.message, 'error');
    }
  }

  /**
   * Handle closing all reference windows
   */
  async handleCloseAllReferences() {
    if (this.isLoading) return;

    this.setLoading(true);
    this.showStatus('Closing all reference windows...', 'info');

    try {
      const response = await this.sendMessage({
        action: 'closeAllReferenceWindows'
      });

      if (response.success) {
        this.showStatus(`Closed ${response.closedCount} reference windows`, 'success');
        await this.loadReferenceWindows();
      } else {
        throw new Error(response.error || 'Failed to close reference windows');
      }
    } catch (error) {
      console.error('Error closing all reference windows:', error);
      this.showStatus('Error: ' + error.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Send message to background script
   * @param {Object} message - Message object
   * @returns {Promise} Response promise
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TabSplitterPopup();
});
