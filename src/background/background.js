// Background service worker for Amazon Wishlist Exporter

console.log('Amazon Wishlist Exporter: Background service worker loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Amazon Wishlist Exporter installed');

    // Open welcome page or instructions
    // chrome.tabs.create({ url: 'welcome.html' });
  } else if (details.reason === 'update') {
    console.log('Amazon Wishlist Exporter updated');
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  // Handle any background tasks here if needed

  return true;
});

// Optional: Set badge text when on wishlist page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('amazon') && tab.url.includes('wishlist')) {
      // Optionally show a badge when on wishlist page
      chrome.action.setBadgeText({ tabId: tabId, text: '✓' });
      chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#4CAF50' });
    } else {
      chrome.action.setBadgeText({ tabId: tabId, text: '' });
    }
  }
});
