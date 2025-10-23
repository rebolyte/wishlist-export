// Content script for Amazon Wishlist Exporter
// This script runs on Amazon wishlist pages

console.log('Amazon Wishlist Exporter: Content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractWishlist') {
    try {
      const wishlistData = extractWishlistData();
      sendResponse({ success: true, data: wishlistData });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});

// Function to extract wishlist data from the page
function extractWishlistData() {
  const items = [];

  // Try to get wishlist name
  const listNameEl = document.querySelector('#profile-list-name, h2[role="heading"], .wl-list-title');
  const listName = listNameEl ? listNameEl.textContent.trim() : 'wishlist';

  // Select all wishlist items - Amazon uses different selectors
  const selectors = [
    '[data-itemid]',
    'li[data-id]',
    '.g-item-sortable',
    '[data-reposition-action-params]',
    'li[role="listitem"]'
  ];

  let itemElements = [];
  for (const selector of selectors) {
    itemElements = document.querySelectorAll(selector);
    if (itemElements.length > 0) break;
  }

  console.log(`Found ${itemElements.length} items`);

  itemElements.forEach((element, index) => {
    try {
      // Product name - try multiple selectors
      const nameSelectors = [
        'h3 a',
        'h2 a',
        'a[id*="itemName"]',
        '#itemName',
        '.a-link-normal[title]',
        'a.a-link-normal'
      ];

      let nameEl = null;
      for (const selector of nameSelectors) {
        nameEl = element.querySelector(selector);
        if (nameEl && nameEl.textContent.trim()) break;
      }

      const name = nameEl ? nameEl.textContent.trim() : '';

      // Product URL
      let url = nameEl ? nameEl.href : '';
      // Make sure URL is absolute
      if (url && !url.startsWith('http')) {
        url = 'https://www.amazon.com' + url;
      }

      // Price - try multiple selectors
      const priceSelectors = [
        '[data-price]',
        '.a-price .a-offscreen',
        '.a-price-whole',
        '.itemPricePrimary',
        '[id*="itemPrice"]',
        '.a-price span:first-child'
      ];

      let price = '';
      for (const selector of priceSelectors) {
        const priceEl = element.querySelector(selector);
        if (priceEl) {
          price = priceEl.textContent.trim();
          if (price) break;
        }
      }

      // Image
      const imageEl = element.querySelector('img');
      let imageUrl = imageEl ? imageEl.src : '';

      // If src is lazy-loaded, try data-src
      if (!imageUrl || imageUrl.includes('transparent-pixel')) {
        const dataSrc = imageEl ? imageEl.getAttribute('data-src') : '';
        if (dataSrc) imageUrl = dataSrc;
      }

      // Rating - try multiple selectors
      const ratingSelectors = [
        '.a-icon-star .a-icon-alt',
        '[data-rating]',
        'i[class*="a-star"] span'
      ];

      let rating = '';
      for (const selector of ratingSelectors) {
        const ratingEl = element.querySelector(selector);
        if (ratingEl) {
          const ratingText = ratingEl.textContent || ratingEl.getAttribute('data-rating');
          const match = ratingText.match(/(\d+\.?\d*)/);
          if (match) {
            rating = match[1];
            break;
          }
        }
      }

      // Date added
      const dateSelectors = [
        '[data-date-added]',
        '.dateAddedText',
        '#itemAddedDate',
        'span[id*="dateAdded"]'
      ];

      let dateAdded = '';
      for (const selector of dateSelectors) {
        const dateEl = element.querySelector(selector);
        if (dateEl) {
          dateAdded = dateEl.textContent.trim();
          if (dateAdded) break;
        }
      }

      // Priority
      const priorityEl = element.querySelector('[data-priority]');
      const priority = priorityEl ? priorityEl.getAttribute('data-priority') : '';

      // Comment/Note
      const commentSelectors = [
        '#itemComment',
        'span[id*="comment"]',
        '.a-size-base.a-color-tertiary'
      ];

      let comment = '';
      for (const selector of commentSelectors) {
        const commentEl = element.querySelector(selector);
        if (commentEl) {
          comment = commentEl.textContent.trim();
          if (comment) break;
        }
      }

      // Only add if we have at least a name
      if (name) {
        items.push({
          name,
          price: price || 'N/A',
          rating: rating || 'N/A',
          url,
          imageUrl,
          dateAdded: dateAdded || 'N/A',
          priority: priority || 'N/A',
          comment: comment || ''
        });
      }
    } catch (err) {
      console.error('Error parsing item:', err);
    }
  });

  if (items.length === 0) {
    throw new Error('No items found on this page. Make sure you are on an Amazon wishlist page.');
  }

  return {
    listName,
    items,
    extractedAt: new Date().toISOString()
  };
}

// Expose function for testing in console
window.extractWishlistData = extractWishlistData;
