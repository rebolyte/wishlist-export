# Amazon Wishlist Exporter

A Chrome extension to export your Amazon wishlists.

Amazon wishlists are convenient because you can quickly save almost any product you find online. But Amazon does not make your wishlists accessible via API or allow OAuth apps to read them. They do have an option to print a wishlist, but doesn't have all the data, doesn't link back to the product pages, and you have to click through to see all items.

This extension automates loading all items for you and gives you some export format options (CSV, JSON, or HTML [print to PDF]).

The extension runs entirely locally in your browser. It doesn't collect anything about you or send anything anywhere.

## Installation

### From Source

1. Clone or download this repository
2. Load the extension

   - Open Chrome and navigate to `chrome://extensions/` (or overflow menu -> Extensions -> Manage extensions)
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `wishlist-export` folder

You should see the extension in your extensions list. Pin it in your toolbar for easy access.

### From Chrome Web Store

`TODO`

## Usage

1. Navigate to your Amazon wishlist
2. Click the extension icon in your Chrome toolbar
3. Choose CSV (Excel/Numbers/Google Sheets), JSON, or HTML (print to PDF)
4. Click "Export Wishlist"
5. Open the exported file

## Errata

https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world

https://developer.chrome.com/docs/extensions/reference
