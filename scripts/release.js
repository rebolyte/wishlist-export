#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const MANIFEST_PATH = path.join(ROOT, 'manifest.json');
const POPUP_PATH = path.join(ROOT, 'src/popup/popup.html');
const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md');

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', ...opts }).trim();
}

function checkPrerequisites() {
  try {
    run('gh --version');
  } catch {
    console.error('Error: gh CLI is not installed');
    process.exit(1);
  }

  const status = run('git status -s');
  if (status) {
    console.error('Error: There are uncommitted changes in the working directory');
    console.error('Please commit or stash your changes before deploying');
    process.exit(1);
  }
}

function calculateVersion() {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'));
  const currentVersion = pkg.version;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}.${month}`;

  if (currentVersion.startsWith(prefix + '.')) {
    const ver = parseInt(currentVersion.split('.')[2], 10);
    return `${prefix}.${ver + 1}`;
  }
  return `${prefix}.1`;
}

function updatePackageJson(version) {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'));
  pkg.version = version;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated package.json to ${version}`);
}

function updateManifest(version) {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  manifest.version = version;
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Updated manifest.json to ${version}`);
}

function updatePopupVersion(version) {
  let content = fs.readFileSync(POPUP_PATH, 'utf-8');
  content = content.replace(/<p class="small">v[\d.]+<\/p>/, `<p class="small">v${version}</p>`);
  fs.writeFileSync(POPUP_PATH, content);
  console.log(`Updated popup.html to v${version}`);
}

function updateChangelog(version) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const newSection = `## [${version}] - ${dateStr}`;

  if (!fs.existsSync(CHANGELOG_PATH)) {
    const template = `# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

${newSection}

- Initial release
`;
    fs.writeFileSync(CHANGELOG_PATH, template);
    console.log('Created CHANGELOG.md');
    return;
  }

  let content = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
  const unreleasedMatch = content.match(/## \[Unreleased\]\n([\s\S]*?)(?=\n## \[|$)/);

  if (!unreleasedMatch) {
    console.error('Error: Could not find ## [Unreleased] section in CHANGELOG.md');
    process.exit(1);
  }

  const unreleasedContent = unreleasedMatch[1].trim();
  const replacement = `## [Unreleased]\n\n${newSection}\n\n${unreleasedContent || '- No changes documented'}`;
  content = content.replace(/## \[Unreleased\]\n[\s\S]*?(?=\n## \[|$)/, replacement + '\n');
  fs.writeFileSync(CHANGELOG_PATH, content);
  console.log(`Updated CHANGELOG.md with ${version}`);
}

function extractReleaseNotes(version) {
  if (!fs.existsSync(CHANGELOG_PATH)) return 'Initial release';
  const content = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
  const regex = new RegExp(`## \\[${version.replace(/\./g, '\\.')}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n## \\[|$)`);
  const match = content.match(regex);
  return match ? match[1].trim() : 'No release notes';
}

function createZip(version) {
  const zipName = `amazon-wishlist-exporter-v${version}.zip`;
  const zipPath = path.join(ROOT, zipName);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  const files = [
    'manifest.json',
    'icons/*.png',
    'vendor/*',
    'src/popup/*',
    'src/content/*',
    'src/background/*',
  ];

  const excludes = '-x "*.test.js"';
  const cmd = `zip -r ${zipName} ${files.join(' ')} ${excludes}`;
  run(cmd);
  console.log(`Created ${zipName}`);
  return zipPath;
}

function gitCommitAndTag(version) {
  const tag = `v${version}`;

  const existingTag = run(`git tag -l ${tag}`);
  if (existingTag) {
    console.error(`Error: Tag ${tag} already exists`);
    process.exit(1);
  }

  run('git add package.json manifest.json src/popup/popup.html CHANGELOG.md');
  run(`git commit -m "chore: bump version to ${version}"`);
  run('git push origin main');
  run(`git tag ${tag} -m ""`);
  run(`git push origin ${tag}`);
  console.log(`Created and pushed tag ${tag}`);
}

function createGitHubRelease(version, zipPath) {
  const tag = `v${version}`;
  const notes = extractReleaseNotes(version);
  const notesFile = path.join(ROOT, '.release-notes-tmp.md');
  fs.writeFileSync(notesFile, notes);

  try {
    run(`gh release create ${tag} "${zipPath}" --title "Release ${tag}" --notes-file "${notesFile}"`);
    console.log(`Created GitHub release ${tag}`);
  } finally {
    if (fs.existsSync(notesFile)) fs.unlinkSync(notesFile);
  }
}

function cleanup(zipPath) {
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
    console.log('Cleaned up zip file');
  }
}

function main() {
  console.log('Starting release process...\n');

  checkPrerequisites();
  const version = calculateVersion();
  console.log(`New version: ${version}\n`);

  updatePackageJson(version);
  updateManifest(version);
  updatePopupVersion(version);
  updateChangelog(version);
  const zipPath = createZip(version);
  gitCommitAndTag(version);
  createGitHubRelease(version, zipPath);
  cleanup(zipPath);

  console.log('\n--------------------------------------------------');
  console.log('Reminder: Upload the extension to Chrome Web Store');
  console.log('https://chrome.google.com/webstore/devconsole');
  console.log('--------------------------------------------------');

  console.log('\nRelease complete!');
}

main();
