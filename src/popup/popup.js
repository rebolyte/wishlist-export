document.addEventListener('alpine:init', function() {  
  Alpine.data('wishlistExporter', function() {
    return {
      isAmazonWishlist: false,
      loading: false,
      scrolling: false,
      success: false,
      error: false,
      errorMessage: '',
      itemCount: 0,
      currentItemCount: 0,
      exportFormat: 'csv',
      categoryFilter: 'all',
      loadingMessage: 'Starting export...',

      init: function() {
        var self = this;
        chrome.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
          var tab = tabs[0];
          self.isAmazonWishlist = tab.url && tab.url.includes('amazon') && tab.url.includes('wishlist');
        });

        chrome.runtime.onMessage.addListener(function(message) {
          if (message.action === 'scrollProgress') {
            self.scrolling = true;
            self.currentItemCount = message.itemCount;
            self.loadingMessage = 'Loading items...';
          }
          if (message.action === 'exportProgress') {
            if (message.state === 'error') {
              self.error = true;
              self.errorMessage = message.message;
              self.loading = false;
              self.scrolling = false;
            } else if (message.state === 'success') {
              self.itemCount = message.itemCount;
              self.success = true;
              self.loading = false;
              self.scrolling = false;
            } else if (message.state === 'creating') {
              self.loadingMessage = message.message;
            } else if (message.state === 'scrolling') {
              self.loadingMessage = message.message;
            }
          }
        });
      },

      exportWishlist: function() {
        var self = this;
        self.loading = true;
        self.scrolling = false;
        self.error = false;
        self.success = false;
        self.currentItemCount = 0;
        self.loadingMessage = 'Scrolling to load all items...';

        chrome.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
          var tab = tabs[0];
          chrome.runtime.sendMessage({
            action: 'startExport',
            tabId: tab.id,
            tabUrl: tab.url,
            exportFormat: self.exportFormat,
            categoryFilter: self.categoryFilter
          });
        });
      },

      reset: function() {
        this.error = false;
        this.success = false;
        this.errorMessage = '';
        this.scrolling = false;
        this.currentItemCount = 0;
      }
    };
  });
});
