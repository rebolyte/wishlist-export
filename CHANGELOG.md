# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2026.01.4] - 2026-03-02

- Move file generation and downloads to background service worker so exports complete even if the popup is closed
- Add category detection (Books, Movies & TV, Music, Video Games) based on product byline
- Add category filter dropdown to export only specific product types (e.g. Books only)
- Extract author and ASIN fields from wishlist items
- Include Author, Category, and ASIN columns in CSV, JSON, and HTML exports
- Separate product title from author in the Name field

## [2026.01.3] - 2026-01-14

- Update extension scopes

## [2026.01.2] - 2026-01-03

- Initial release
