function wishlistExporter() {
  return {
    isAmazonWishlist: false,
    loading: false,
    success: false,
    error: false,
    errorMessage: '',
    itemCount: 0,
    exportFormat: 'csv',

    async init() {
      // Check if current tab is an Amazon wishlist
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.isAmazonWishlist = tab.url && tab.url.includes('amazon') && tab.url.includes('wishlist');
    },

    async exportWishlist() {
      this.loading = true;
      this.error = false;
      this.success = false;

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Inject and execute content script to extract wishlist data
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractWishlistData
        });

        const wishlistData = results[0].result;

        if (!wishlistData || wishlistData.items.length === 0) {
          throw new Error('No items found in wishlist');
        }

        this.itemCount = wishlistData.items.length;

        // Export data
        if (this.exportFormat === 'csv') {
          this.exportAsCSV(wishlistData);
        } else {
          this.exportAsExcel(wishlistData);
        }

        this.success = true;
        this.loading = false;
      } catch (err) {
        this.error = true;
        this.errorMessage = err.message || 'Failed to export wishlist';
        this.loading = false;
      }
    },

    exportAsCSV(wishlistData) {
      const headers = ['Name', 'Price', 'Rating', 'Product URL', 'Image URL', 'Date Added', 'Priority'];
      const rows = wishlistData.items.map(item => [
        this.escapeCSV(item.name),
        this.escapeCSV(item.price),
        item.rating || '',
        item.url,
        item.imageUrl,
        item.dateAdded || '',
        item.priority || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const filename = `amazon-wishlist-${wishlistData.listName || 'export'}-${Date.now()}.csv`;

      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      });
    },

    exportAsExcel(wishlistData) {
      // For Excel, we'll use CSV format for simplicity
      // To get true Excel format, we'd need to include SheetJS library
      // For now, CSV with .xlsx extension will work in most cases
      const headers = ['Name', 'Price', 'Rating', 'Product URL', 'Image URL', 'Date Added', 'Priority'];
      const rows = wishlistData.items.map(item => [
        this.escapeCSV(item.name),
        this.escapeCSV(item.price),
        item.rating || '',
        item.url,
        item.imageUrl,
        item.dateAdded || '',
        item.priority || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const filename = `amazon-wishlist-${wishlistData.listName || 'export'}-${Date.now()}.xlsx`;

      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      });
    },

    escapeCSV(value) {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    },

    reset() {
      this.error = false;
      this.success = false;
      this.errorMessage = '';
    }
  };
}

// This function will be injected into the page
function extractWishlistData() {
  const items = [];

  // Try to get wishlist name
  const listNameEl = document.querySelector('#profile-list-name, h2[role="heading"]');
  const listName = listNameEl ? listNameEl.textContent.trim() : 'wishlist';

  // Select all wishlist items - Amazon uses different selectors depending on the page
  const itemElements = document.querySelectorAll('[data-itemid], li[data-id], .g-item-sortable');

  itemElements.forEach(element => {
    try {
      // Product name
      const nameEl = element.querySelector('h3 a, h2 a, a[id*="itemName"], #itemName');
      const name = nameEl ? nameEl.textContent.trim() : '';

      // Product URL
      const url = nameEl ? nameEl.href : '';

      // Price - try multiple selectors
      const priceEl = element.querySelector('[data-price], .a-price .a-offscreen, .a-price-whole, .itemPricePrimary');
      const price = priceEl ? priceEl.textContent.trim() : '';

      // Image
      const imageEl = element.querySelector('img');
      const imageUrl = imageEl ? imageEl.src : '';

      // Rating - try multiple selectors
      const ratingEl = element.querySelector('.a-icon-star .a-icon-alt, [data-rating]');
      let rating = '';
      if (ratingEl) {
        const ratingText = ratingEl.textContent || ratingEl.getAttribute('data-rating');
        const match = ratingText.match(/(\d+\.?\d*)/);
        rating = match ? match[1] : '';
      }

      // Date added
      const dateEl = element.querySelector('[data-date-added], .dateAddedText');
      const dateAdded = dateEl ? dateEl.textContent.trim() : '';

      // Priority
      const priorityEl = element.querySelector('[data-priority]');
      const priority = priorityEl ? priorityEl.getAttribute('data-priority') : '';

      if (name) {
        items.push({
          name,
          price,
          rating,
          url,
          imageUrl,
          dateAdded,
          priority
        });
      }
    } catch (err) {
      console.error('Error parsing item:', err);
    }
  });

  return {
    listName,
    items
  };
}
