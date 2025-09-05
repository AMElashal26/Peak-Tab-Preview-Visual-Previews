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
    
    this.tabs = [];
    this.isLoading = false;
    
    this.init();
  }

  /**
   * Initialize the popup
   */
  async init() {
    try {
      await this.loadTabs();
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
