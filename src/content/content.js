// Content script for Amazon Wishlist Exporter
// This script runs on Amazon wishlist pages

console.log('Amazon Wishlist Exporter: Content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractWishlist') {
    // Run async extraction with scrolling
    extractWishlistWithScrolling(sendResponse);
    return true; // Keep channel open for async response
  }
});

// Main function to scroll and extract all wishlist items
async function extractWishlistWithScrolling(sendResponse) {
  try {
    // First, scroll to load all items
    const scrollResult = await scrollToLoadAllItems((progress) => {
      // Send progress updates
      chrome.runtime.sendMessage({
        action: 'scrollProgress',
        itemCount: progress.itemCount,
        isComplete: false
      });
    });

    console.log(`Finished scrolling. Total items found: ${scrollResult.totalItems}`);

    // Now extract all the data
    const wishlistData = extractWishlistData();
    sendResponse({ success: true, data: wishlistData });

  } catch (error) {
    console.error('Error during extraction:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Scroll through the page to trigger lazy loading of all items
async function scrollToLoadAllItems(progressCallback) {
  return new Promise((resolve, reject) => {
    let lastItemCount = 0;
    let stableCount = 0;
    const maxStableChecks = 3; // Stop if count is stable for 3 checks
    let scrollAttempts = 0;
    const maxScrollAttempts = 100; // Safety limit

    const selectors = [
      '[data-itemid]',
      'li[data-id]',
      '.g-item-sortable',
      '[data-reposition-action-params]',
      'li[role="listitem"]'
    ];

    function getCurrentItemCount() {
      for (const selector of selectors) {
        const items = document.querySelectorAll(selector);
        if (items.length > 0) return items.length;
      }
      return 0;
    }

    function scrollStep() {
      scrollAttempts++;

      // Scroll to bottom
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });

      // Wait for new items to load
      setTimeout(() => {
        const currentItemCount = getCurrentItemCount();

        console.log(`Scroll attempt ${scrollAttempts}: Found ${currentItemCount} items`);

        // Check if item count has changed
        if (currentItemCount === lastItemCount) {
          stableCount++;
        } else {
          stableCount = 0;
          lastItemCount = currentItemCount;
        }

        // Send progress update
        if (progressCallback) {
          progressCallback({
            itemCount: currentItemCount,
            scrollAttempts
          });
        }

        // Check if we're done
        if (stableCount >= maxStableChecks) {
          console.log('Item count stable. All items loaded.');
          window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll back to top
          setTimeout(() => {
            resolve({ totalItems: currentItemCount });
          }, 500);
        } else if (scrollAttempts >= maxScrollAttempts) {
          console.log('Max scroll attempts reached.');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => {
            resolve({ totalItems: currentItemCount });
          }, 500);
        } else {
          // Continue scrolling
          scrollStep();
        }
      }, 1500); // Wait 1.5s for items to load
    }

    // Start scrolling
    const initialCount = getCurrentItemCount();
    if (initialCount === 0) {
      reject(new Error('No items found on page'));
      return;
    }

    lastItemCount = initialCount;
    scrollStep();
  });
}

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

      const title = nameEl ? nameEl.textContent.trim() : '';

      // Subtitle (byline with author/format info)
      const bylineSelectors = [
        'span[id*="item-byline"]',
        'span.a-size-base',
        '.a-row.a-size-small span.a-size-base'
      ];

      let subtitle = '';
      for (const selector of bylineSelectors) {
        const bylineEl = element.querySelector(selector);
        if (bylineEl && bylineEl.textContent.trim()) {
          subtitle = bylineEl.textContent.trim();
          break;
        }
      }

      const name = subtitle ? `${title} ${subtitle}` : title;

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
      let priority = '';
      const priorityLabelEl = element.querySelector('span[id^="itemPriorityLabel_"], #itemPriorityLabel');
      if (priorityLabelEl && priorityLabelEl.textContent) {
        priority = priorityLabelEl.textContent.trim();
      } else {
        const priorityCodeEl = element.querySelector('span[id^="itemPriority_"], #itemPriority');
        const code = priorityCodeEl ? priorityCodeEl.textContent.trim() : '';
        if (code === '2') priority = 'highest';
        else if (code === '1') priority = 'high';
        else if (code === '0') priority = 'medium';
        else {
          const dataPriorityEl = element.querySelector('[data-priority]');
          priority = dataPriorityEl ? (dataPriorityEl.getAttribute('data-priority') || '').trim() : '';
        }
      }

      // Needs / Has counts
      let needs = '';
      let has = '';
      const needsEl = element.querySelector('#itemRequested, span[id^="itemRequested_"]');
      if (needsEl && needsEl.textContent) needs = needsEl.textContent.trim();
      const hasEl = element.querySelector('#itemPurchased, span[id^="itemPurchased_"]');
      if (hasEl && hasEl.textContent) has = hasEl.textContent.trim();

      // Comment/Note
      const commentSelectors = [
        'span[id^="itemComment"]',
        '[id^="itemComment_"]',
        'span.awl-ul-keyword-item-truncated-text',
        'span[id*="Comment"]',
        'span[id*="comment"]',
        '#itemComment',
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
          title,
          subtitle,
          price: price || 'N/A',
          rating: rating || 'N/A',
          url,
          imageUrl,
          dateAdded: dateAdded || 'N/A',
          priority: priority || 'N/A',
          needs: needs || '',
          has: has || '',
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
