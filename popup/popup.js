document.addEventListener('alpine:init', () => {  
  Alpine.data('wishlistExporter', () => ({
    isAmazonWishlist: false,
    loading: false,
    scrolling: false,
    success: false,
    error: false,
    errorMessage: '',
    itemCount: 0,
    currentItemCount: 0,
    exportFormat: 'csv',
    loadingMessage: 'Starting export...',
    loadTime: '',

    async init() {
      console.log('init');
      const now = new Date();
      this.loadTime = now.toLocaleString();
      // Check if current tab is an Amazon wishlist
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.isAmazonWishlist = tab.url && tab.url.includes('amazon') && tab.url.includes('wishlist');

      // Listen for scroll progress messages
      chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'scrollProgress') {
          this.scrolling = true;
          this.currentItemCount = message.itemCount;
          this.loadingMessage = `Loading items... Found ${message.itemCount} so far`;
        }
      });
    },

    async exportWishlist() {
      this.loading = true;
      this.scrolling = false;
      this.error = false;
      this.success = false;
      this.currentItemCount = 0;
      this.loadingMessage = 'Scrolling to load all items...';

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Send message to content script to extract wishlist
        chrome.tabs.sendMessage(
          tab.id,
          { action: 'extractWishlist' },
          (response) => {
            if (chrome.runtime.lastError) {
              this.error = true;
              this.errorMessage = 'Could not connect to page. Try refreshing the wishlist page.';
              this.loading = false;
              return;
            }

            if (!response || !response.success) {
              this.error = true;
              this.errorMessage = response?.error || 'Failed to extract wishlist data';
              this.loading = false;
              return;
            }

            const wishlistData = response.data;

            if (!wishlistData || wishlistData.items.length === 0) {
              this.error = true;
              this.errorMessage = 'No items found in wishlist';
              this.loading = false;
              return;
            }

            wishlistData.url = tab.url;

            this.itemCount = wishlistData.items.length;
            this.loadingMessage = 'Creating export file...';

            // Export data
            if (this.exportFormat === 'csv') {
              this.exportAsCSV(wishlistData);
            } else {
              this.exportAsJSON(wishlistData);
            }

            this.success = true;
            this.loading = false;
            this.scrolling = false;
          }
        );

      } catch (err) {
        this.error = true;
        this.errorMessage = err.message || 'Failed to export wishlist';
        this.loading = false;
        this.scrolling = false;
      }
    },

    exportAsCSV(wishlistData) {
      const headers = ['Name', 'Price', 'Rating', 'Product URL', 'Image URL', 'Date Added', 'Priority', 'Needs', 'Has', 'Comment'];
      const rows = wishlistData.items.map(item => [
        this.escapeCSV(item.name),
        this.escapeCSV(item.price),
        item.rating || '',
        item.url,
        item.imageUrl,
        this.escapeCSV(this.formatDateAdded(item.dateAdded || '')),
        item.priority || '',
        item.needs || '',
        item.has || '',
        this.escapeCSV(item.comment || '')
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

    exportAsJSON(wishlistData) {
      const formattedData = {
        ...wishlistData,
        items: wishlistData.items.map(item => ({
          ...item,
          dateAdded: this.formatDateAdded(item.dateAdded || '')
        }))
      };
      
      const jsonContent = JSON.stringify(formattedData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const filename = `amazon-wishlist-${wishlistData.listName || 'export'}-${Date.now()}.json`;

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

    formatDateAdded(value) {
      if (value === null || value === undefined) return '';
      const text = String(value).trim();
      return text.replace(/^\s*(Item added|Added)\s+/i, '').trim();
    },

    reset() {
      this.error = false;
      this.success = false;
      this.errorMessage = '';
      this.scrolling = false;
      this.currentItemCount = 0;
    },

    reloadExtension() {
      chrome.runtime.reload();
    }
  }));
});
