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
          this.loadingMessage = `Loading items...`;
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
            } else if (this.exportFormat === 'html') {
              this.exportAsHTML(wishlistData);
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

    exportAsHTML(wishlistData) {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wish List - ${this.escapeHTML(wishlistData.listName || 'Wishlist')}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      padding: 20px;
      background: white;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .wishlist-info {
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #ddd;
    }
    .wishlist-url {
      font-size: 12px;
      color: #007185;
      margin-bottom: 4px;
      word-break: break-all;
    }
    .wishlist-url a {
      color: #007185;
      text-decoration: none;
    }
    .wishlist-url a:hover {
      color: #C7511F;
      text-decoration: underline;
    }
    .exported-at {
      font-size: 11px;
      color: #565959;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    thead {
      border-bottom: 2px solid #000;
    }
    th {
      text-align: left;
      padding: 12px 8px;
      font-weight: 700;
      font-size: 14px;
    }
    tbody tr {
      border-bottom: 1px solid #ddd;
      page-break-inside: avoid;
    }
    td {
      padding: 12px 8px;
      vertical-align: top;
      font-size: 13px;
    }
    td.image-cell {
      width: 60px;
    }
    td.image-cell img {
      width: 50px;
      height: auto;
      display: block;
    }
    td.title-cell {
      width: auto;
    }
    .product-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .product-title a {
      color: #007185;
      text-decoration: none;
    }
    .product-title a:hover {
      color: #C7511F;
      text-decoration: underline;
    }
    .product-details {
      font-size: 12px;
      color: #565959;
    }
    td.comments-cell {
      width: 25%;
      color: #565959;
    }
    td.price-cell {
      width: 80px;
      text-align: right;
    }
    td.date-cell {
      width: 100px;
      color: #565959;
    }
    td.priority-cell {
      width: 80px;
      text-align: center;
    }
    td.needs-cell {
      width: 60px;
      text-align: center;
    }
    td.has-cell {
      width: 60px;
      text-align: center;
    }
    @media print {
      body {
        padding: 10px;
      }
      h1 {
        font-size: 20px;
      }
      table {
        font-size: 11px;
      }
      th {
        font-size: 12px;
      }
      td {
        font-size: 11px;
      }
      .product-details {
        font-size: 10px;
      }
    }
  </style>
</head>
<body>
  <h1>Wish List - ${this.escapeHTML(wishlistData.listName || 'Wishlist')}</h1>
  <div class="wishlist-info">
    <div class="wishlist-url"><a href="${this.escapeHTML(wishlistData.url || '')}" target="_blank">${this.escapeHTML(wishlistData.url || '')}</a></div>
    <div class="exported-at">Exported: ${new Date().toLocaleString()}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th colspan="2">Title</th>
        <th>Comments</th>
        <th>Price</th>
        <th>Date Added</th>
        <th>Priority</th>
        <th>Needs</th>
        <th>Has</th>
      </tr>
    </thead>
    <tbody>
${wishlistData.items.map(item => `      <tr>
        <td class="image-cell">
          ${item.imageUrl ? `<img src="${this.escapeHTML(item.imageUrl)}" alt="">` : ''}
        </td>
        <td class="title-cell">
          <div class="product-title"><a href="${this.escapeHTML(item.url || '')}" target="_blank">${this.escapeHTML(item.name)}</a></div>
          <div class="product-details">${this.escapeHTML(this.extractAuthorDetails(item.name))}</div>
        </td>
        <td class="comments-cell">${this.escapeHTML(item.comment || '')}</td>
        <td class="price-cell">${this.escapeHTML(item.price || '')}</td>
        <td class="date-cell">${this.escapeHTML(this.formatDateAdded(item.dateAdded || ''))}</td>
        <td class="priority-cell">${this.escapeHTML(item.priority || '')}</td>
        <td class="needs-cell">${this.escapeHTML(item.needs || '1')}</td>
        <td class="has-cell">${this.escapeHTML(item.has || '0')}</td>
      </tr>`).join('\n')}
    </tbody>
  </table>
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const filename = `amazon-wishlist-${wishlistData.listName || 'export'}-${Date.now()}.html`;

      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: false
      }, (downloadId) => {
        chrome.downloads.search({ id: downloadId }, (results) => {
          if (results && results[0] && results[0].filename) {
            const filePath = 'file://' + results[0].filename;
            chrome.tabs.create({ url: filePath });
          }
        });
      });
    },

    escapeHTML(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    extractAuthorDetails(name) {
      if (!name) return '';
      const byMatch = name.match(/by\s+(.+)$/i);
      return byMatch ? byMatch[0] : '';
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
