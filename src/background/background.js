console.log('Amazon Wishlist Exporter: Background service worker loaded');

chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    console.log('Amazon Wishlist Exporter installed');
  } else if (details.reason === 'update') {
    console.log('Amazon Wishlist Exporter updated');
  }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('amazon') && tab.url.includes('wishlist')) {
      chrome.action.setBadgeText({ tabId: tabId, text: '✓' });
      chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#4CAF50' });
    } else {
      chrome.action.setBadgeText({ tabId: tabId, text: '' });
    }
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'startExport') {
    handleExport(request.tabId, request.tabUrl, request.exportFormat, request.categoryFilter);
    sendResponse({ started: true });
    return false;
  }
  return true;
});

async function handleExport(tabId, tabUrl, exportFormat, categoryFilter) {
  try {
    broadcastProgress({ state: 'scrolling', message: 'Scrolling to load all items...' });

    var response = await chrome.tabs.sendMessage(tabId, { action: 'extractWishlist' });

    if (!response || !response.success) {
      broadcastProgress({ state: 'error', message: response ? response.error : 'Failed to extract wishlist data' });
      return;
    }

    var wishlistData = response.data;

    if (!wishlistData || wishlistData.items.length === 0) {
      broadcastProgress({ state: 'error', message: 'No items found in wishlist' });
      return;
    }

    wishlistData.url = tabUrl;

    if (categoryFilter && categoryFilter !== 'all') {
      wishlistData.items = wishlistData.items.filter(function(item) {
        return item.category === categoryFilter;
      });
      if (wishlistData.items.length === 0) {
        broadcastProgress({ state: 'error', message: 'No items match the selected category filter' });
        return;
      }
    }

    broadcastProgress({ state: 'creating', message: 'Creating export file...' });

    if (exportFormat === 'csv') {
      exportAsCSV(wishlistData);
    } else if (exportFormat === 'html') {
      exportAsHTML(wishlistData);
    } else {
      exportAsJSON(wishlistData);
    }

    broadcastProgress({
      state: 'success',
      message: 'Wishlist exported successfully!',
      itemCount: wishlistData.items.length
    });

  } catch (err) {
    broadcastProgress({ state: 'error', message: err.message || 'Failed to export wishlist' });
  }
}

function broadcastProgress(data) {
  chrome.runtime.sendMessage(Object.assign({ action: 'exportProgress' }, data)).catch(function() {});
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  var s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function formatDateAdded(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/^\s*(Item added|Added)\s+/i, '').trim();
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function exportAsCSV(wishlistData) {
  var headers = ['Name', 'Author', 'Category', 'ASIN', 'Price', 'Rating', 'Product URL', 'Image URL', 'Date Added', 'Priority', 'Needs', 'Has', 'Comment'];
  var rows = wishlistData.items.map(function(item) {
    return [
      escapeCSV(item.name),
      escapeCSV(item.author || ''),
      escapeCSV(item.category || ''),
      escapeCSV(item.asin || ''),
      escapeCSV(item.price),
      item.rating || '',
      item.url,
      item.imageUrl,
      escapeCSV(formatDateAdded(item.dateAdded || '')),
      item.priority || '',
      item.needs || '',
      item.has || '',
      escapeCSV(item.comment || '')
    ];
  });

  var csvContent = [headers.join(',')].concat(rows.map(function(row) { return row.join(','); })).join('\n');
  var dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
  var filename = 'amazon-wishlist-' + (wishlistData.listName || 'export') + '-' + Date.now() + '.csv';

  chrome.downloads.download({ url: dataUrl, filename: filename, saveAs: true });
}

function exportAsJSON(wishlistData) {
  var formattedData = {
    listName: wishlistData.listName,
    url: wishlistData.url,
    extractedAt: wishlistData.extractedAt,
    items: wishlistData.items.map(function(item) {
      return {
        name: item.name,
        title: item.title,
        subtitle: item.subtitle,
        author: item.author || '',
        category: item.category || '',
        asin: item.asin || '',
        price: item.price,
        rating: item.rating,
        url: item.url,
        imageUrl: item.imageUrl,
        dateAdded: formatDateAdded(item.dateAdded || ''),
        priority: item.priority,
        needs: item.needs,
        has: item.has,
        comment: item.comment
      };
    })
  };

  var jsonContent = JSON.stringify(formattedData, null, 2);
  var dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonContent);
  var filename = 'amazon-wishlist-' + (wishlistData.listName || 'export') + '-' + Date.now() + '.json';

  chrome.downloads.download({ url: dataUrl, filename: filename, saveAs: true });
}

function exportAsHTML(wishlistData) {
  var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Wish List - ' + escapeHTML(wishlistData.listName || 'Wishlist') + '</title>\n  <style>\n'
    + '    * { margin: 0; padding: 0; box-sizing: border-box; }\n'
    + '    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 20px; background: white; }\n'
    + '    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }\n'
    + '    .wishlist-info { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #ddd; }\n'
    + '    .wishlist-url { font-size: 12px; color: #007185; margin-bottom: 4px; word-break: break-all; }\n'
    + '    .wishlist-url a { color: #007185; text-decoration: none; }\n'
    + '    .wishlist-url a:hover { color: #C7511F; text-decoration: underline; }\n'
    + '    .exported-at { font-size: 11px; color: #565959; }\n'
    + '    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }\n'
    + '    thead { border-bottom: 2px solid #000; }\n'
    + '    th { text-align: left; padding: 12px 8px; font-weight: 700; font-size: 14px; }\n'
    + '    tbody tr { border-bottom: 1px solid #ddd; page-break-inside: avoid; }\n'
    + '    td { padding: 12px 8px; vertical-align: top; font-size: 13px; }\n'
    + '    td.image-cell { width: 60px; }\n'
    + '    td.image-cell img { width: 50px; height: auto; display: block; }\n'
    + '    td.title-cell { width: auto; }\n'
    + '    .product-title { font-weight: 600; margin-bottom: 4px; }\n'
    + '    .product-title a { color: #007185; text-decoration: none; }\n'
    + '    .product-title a:hover { color: #C7511F; text-decoration: underline; }\n'
    + '    .product-details { font-size: 12px; color: #565959; }\n'
    + '    td.comments-cell { width: 20%; color: #565959; }\n'
    + '    td.category-cell { width: 80px; color: #565959; }\n'
    + '    td.price-cell { width: 80px; text-align: right; }\n'
    + '    td.date-cell { width: 100px; color: #565959; }\n'
    + '    td.priority-cell { width: 80px; text-align: center; }\n'
    + '    td.needs-cell { width: 60px; text-align: center; }\n'
    + '    td.has-cell { width: 60px; text-align: center; }\n'
    + '    @media print { body { padding: 10px; } h1 { font-size: 20px; } table { font-size: 11px; } th { font-size: 12px; } td { font-size: 11px; } .product-details { font-size: 10px; } }\n'
    + '  </style>\n</head>\n<body>\n'
    + '  <h1>Wish List - ' + escapeHTML(wishlistData.listName || 'Wishlist') + '</h1>\n'
    + '  <div class="wishlist-info">\n'
    + '    <div class="wishlist-url"><a href="' + escapeHTML(wishlistData.url || '') + '" target="_blank">' + escapeHTML(wishlistData.url || '') + '</a></div>\n'
    + '    <div class="exported-at">Exported: ' + new Date().toLocaleString() + '</div>\n'
    + '  </div>\n'
    + '  <table>\n    <thead>\n      <tr>\n'
    + '        <th colspan="2">Title</th>\n        <th>Category</th>\n        <th>Comments</th>\n        <th>Price</th>\n        <th>Date Added</th>\n        <th>Priority</th>\n        <th>Needs</th>\n        <th>Has</th>\n'
    + '      </tr>\n    </thead>\n    <tbody>\n'
    + wishlistData.items.map(function(item) {
        return '      <tr>\n'
          + '        <td class="image-cell">' + (item.imageUrl ? '<img src="' + escapeHTML(item.imageUrl) + '" alt="">' : '') + '</td>\n'
          + '        <td class="title-cell">\n'
          + '          <div class="product-title"><a href="' + escapeHTML(item.url || '') + '" target="_blank"><strong>' + escapeHTML(item.title) + '</strong></a></div>\n'
          + '          <div class="product-details">' + escapeHTML(item.subtitle || '') + '</div>\n'
          + '        </td>\n'
          + '        <td class="category-cell">' + escapeHTML(item.category || '') + '</td>\n'
          + '        <td class="comments-cell">' + escapeHTML(item.comment || '') + '</td>\n'
          + '        <td class="price-cell">' + escapeHTML(item.price || '') + '</td>\n'
          + '        <td class="date-cell">' + escapeHTML(formatDateAdded(item.dateAdded || '')) + '</td>\n'
          + '        <td class="priority-cell">' + escapeHTML(item.priority || '') + '</td>\n'
          + '        <td class="needs-cell">' + escapeHTML(item.needs || '1') + '</td>\n'
          + '        <td class="has-cell">' + escapeHTML(item.has || '0') + '</td>\n'
          + '      </tr>';
      }).join('\n')
    + '\n    </tbody>\n  </table>\n</body>\n</html>';

  var dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
  var filename = 'amazon-wishlist-' + (wishlistData.listName || 'export') + '-' + Date.now() + '.html';

  chrome.downloads.download({ url: dataUrl, filename: filename, saveAs: false }, function(downloadId) {
    chrome.downloads.search({ id: downloadId }, function(results) {
      if (results && results[0] && results[0].filename) {
        chrome.tabs.create({ url: 'file://' + results[0].filename });
      }
    });
  });
}
