# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.2] - 2026-03-20

### Changed
- Bumped extension version to `1.3.2` for Microsoft Edge release packaging.

## [1.0.0] - 2024-01-XX

### Added
- Auto-push accepted LeetCode solutions to GitHub
- Toggle ON/OFF switch for extension control
- Real-time activity logging
- Desktop notifications for push status
- Support for multiple programming languages
- Statistics tracking (runtime, memory)
- Private data handling (no data collection)
- Firefox and Chrome compatibility

### Features
- 🎯 Automatic detection of "Accepted" submissions
- 🔄 Real-time synchronization with GitHub repository
- 📊 Submission statistics (runtime, memory usage)
- 🔔 Desktop notifications on success/failure
- 📝 Activity log with last 10 submissions
- 🛡️ Private: No data collection, all processing local
- ⚡ Lightweight: Pure vanilla JavaScript
- 🎨 Clean terminal-themed UI

### Technical
- Manifest V3 compliance
- MutationObserver with throttling
- Submission ID deduplication
- SHA-based file update checking
- Monaco Editor code extraction
- GitHub API integration

### Security
- Zero external data collection
- Local storage only (Chrome Storage API)
- GitHub token stored securely in local storage
- No tracking or analytics

---

## [Unreleased]

### Planned Features
- Support for more code hosting platforms (GitLab, Bitbucket)
- Custom folder structure configuration
- Batch upload for historical submissions
- Problem metadata (difficulty, tags, acceptance rate)
- Solution templates with problem description

---

**Note**: This is the initial release. Future updates will be documented here.
