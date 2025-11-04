# Amazon Wishlist Exporter

A Chrome extension to export your Amazon wishlist to CSV or Excel spreadsheet format.

## Features

- ✅ **Automatic scrolling** to load all items (handles lazy loading)
- ✅ Export Amazon wishlists to CSV or Excel format
- ✅ Works with private wishlists (you must be logged in)
- ✅ Extracts product details: name, price, rating, URL, image, date added, priority, comments
- ✅ Supports multiple Amazon domains (.com, .co.uk, .de, .fr, etc.)
- ✅ Real-time progress updates showing items found
- ✅ Simple and clean UI built with Alpine.js
- ✅ No external servers - all processing happens locally in your browser

## Installation

### From Source (Developer Mode)

1. **Clone or download this repository**

   ```bash
   git clone https://github.com/rebolyte/legendary-octo-bassoon.git
   cd legendary-octo-bassoon
   ```

2. **Load the extension in Chrome**

   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `legendary-octo-bassoon` folder

3. **Verify installation**
   - You should see the "Amazon Wishlist Exporter" extension in your extensions list
   - Pin the extension to your toolbar for easy access

## Usage

1. **Navigate to your Amazon wishlist**

   - Go to Amazon.com (or any supported Amazon domain)
   - Make sure you're logged in
   - Open any of your wishlists

2. **Open the extension**

   - Click the extension icon in your Chrome toolbar
   - The extension will detect if you're on a wishlist page

3. **Choose export format**

   - Select either CSV or Excel format
   - CSV is smaller and works with any spreadsheet program
   - Excel (.xlsx) is better for Microsoft Excel users

4. **Export your wishlist**

   - Click "Export Wishlist" button
   - The extension will automatically scroll through the page to load all items
   - You'll see real-time progress as items are discovered
   - Once all items are loaded, the export will be created automatically
   - A download dialog will appear to save your file

5. **Open the exported file**
   - Open with Excel, Google Sheets, Numbers, or any spreadsheet program
   - The file includes columns for: Name, Price, Rating, Product URL, Image URL, Date Added, Priority, Comment

## Supported Amazon Domains

- amazon.com (US)
- amazon.co.uk (UK)
- amazon.ca (Canada)
- amazon.de (Germany)
- amazon.fr (France)
- amazon.it (Italy)
- amazon.es (Spain)
- amazon.co.jp (Japan)
- amazon.in (India)
- amazon.com.au (Australia)

## Exported Data

The spreadsheet includes the following columns:

| Column      | Description                             |
| ----------- | --------------------------------------- |
| Name        | Product title                           |
| Price       | Current price (or "N/A" if unavailable) |
| Rating      | Star rating out of 5                    |
| Product URL | Direct link to the product page         |
| Image URL   | Product image URL                       |
| Date Added  | When the item was added to wishlist     |
| Priority    | Item priority (if set)                  |
| Comment     | Item comment/note (if set)              |

## Troubleshooting

### "Please navigate to an Amazon wishlist page"

- Make sure you're on a valid Amazon wishlist URL
- The URL should contain `/wishlist/` in the path

### "No items found in wishlist"

- Refresh the wishlist page and try again
- Make sure the wishlist has items
- Amazon may have changed their page structure - please report an issue

### Export doesn't work

- Check that you've granted the extension permission to access Amazon domains
- Try reloading the wishlist page
- Check the browser console for errors (F12 → Console tab)

## Privacy

This extension:

- ✅ Runs entirely in your browser
- ✅ Does NOT send any data to external servers
- ✅ Does NOT collect or store your personal information
- ✅ Only accesses Amazon pages when you're on a wishlist
- ✅ Source code is fully open and auditable

## Development

### Project Structure

```
legendary-octo-bassoon/
├── manifest.json          # Extension manifest (Manifest V3)
├── popup/
│   ├── popup.html        # Extension popup UI
│   ├── popup.js          # Alpine.js logic
│   └── popup.css         # Styles
├── content/
│   └── content.js        # Content script for data extraction
├── background/
│   └── background.js     # Service worker
├── icons/
│   ├── icon16.png        # 16x16 icon
│   ├── icon48.png        # 48x48 icon
│   └── icon128.png       # 128x128 icon
└── README.md
```

### Tech Stack

- **Manifest V3** - Latest Chrome extension standard
- **Alpine.js** - Lightweight reactive framework for UI
- **Vanilla JavaScript** - No build process required
- **Chrome Extensions API** - For tab access, downloads, and scripting

### Testing

1. Load extension in developer mode
2. Navigate to an Amazon wishlist
3. Open extension popup
4. Test CSV and Excel export
5. Verify downloaded files open correctly

### Building for Distribution

To package the extension for distribution:

1. Remove or update the icons with your own
2. Test thoroughly on different Amazon domains
3. Zip the folder:
   ```bash
   zip -r amazon-wishlist-exporter.zip . -x "*.git*" -x "node_modules/*"
   ```
4. Upload to Chrome Web Store (requires developer account)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Known Limitations

- Amazon's HTML structure may change, requiring updates to selectors
- Auto-scroll has a safety limit of 100 scroll attempts
- Very large wishlists (500+ items) may take a minute or two to fully load

## Future Enhancements

- [ ] True Excel format with formatting and formulas (currently using CSV)
- [ ] Filter and sort options before export
- [ ] Export multiple wishlists at once
- [ ] Custom column selection
- [ ] Configurable scroll speed and timeout settings

## License

MIT License - See LICENSE file for details

## Disclaimer

This extension is not affiliated with or endorsed by Amazon. It is an independent tool created to help users export their own wishlist data. Use at your own risk and in accordance with Amazon's Terms of Service.

## Errata

https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world

https://developer.chrome.com/docs/extensions/reference
