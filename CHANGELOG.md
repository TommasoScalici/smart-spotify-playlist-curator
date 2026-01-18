# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 1.1.0 (2026-01-18)

### Features

- Add `debug-audio-features` script, implement max tracks per artist rule, and introduce AI overfetch ratio. ([4b58463](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/4b58463b28902218a3924fc1037d57c855dba68a))
- Add dry run functionality, implement structured logging, and configure CI workflow. ([ae1a606](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/ae1a606d3b2349971a71393ecf9c294fe171764e))
- Complete UX flow (ActivityFeed, Tutorial), fix lint hooks, and silence test logs. ([96f9348](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/96f93488d9297359b239453472ceabf9228be548))
- complete UX flow, add release automation, and update docs ([b45cb56](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/b45cb563c730b198b0bcdc08fbbb387f4a9714c1))
- Configure Jest for logger mocking and granular test scripts, update module import paths, and enhance AI prompt options. ([9d5c1ef](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/9d5c1ef334b60646f3582afb88fa76c444872248))
- establish initial Firebase functions project with core logic, Spotify/AI services, and comprehensive testing. ([6424a35](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/6424a35a6b68b3cf23e74d2baa1dc0aa64a203fe))
- implement multi-tenant backend execution, dynamic Spotify tokens, and full build fixes ([17f8e91](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/17f8e9173acf1b4d31602512dd0e192e938d1097))
- Implement skeleton-based playlist update strategy, remove audio features, and update dependencies. ([bcbbab2](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/bcbbab2d4e57f8d328150d0e401fd6b899e89c39))
- Implement Spotify API service, environment validation, and structured playlist configuration with a connection test. ([cc838dd](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/cc838ddaa3915a3d18f04ddc1c4033f88d58276f))
- introduce playlist curation Cloud Function, add local curator scripts, and enhance orchestrator's track management for improved playlist updates. ([af2b93e](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/af2b93e4fe9b9e64461fded1141164792e96d206))
- Introduce web application, Firebase functions, CI/CD, and developer tooling including Husky hooks and Prettier. ([2179d95](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/2179d9548079132f336ed9cb8fdc619cb25a3999))
- Migrate curator and playlist check scripts to use Firestore for configuration and refine orchestrator's track addition to include missing VIPs. ([f155f8c](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/f155f8c4b5d58357e007b4b2088fd127b08e39b5))
- Migrate playlist configuration from local files to a Firestore-backed ConfigService. ([0e89c05](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/0e89c058045f1a89356132e420fbbf52a43b73c5))
- Migrate to ESLint flat configuration, add example playlist config, and improve type safety. ([e1d95b4](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/e1d95b4b0519c0e883af5834073ee6b556f786fd))
- **phase-3:** unify architecture, testing & state ([4504807](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/45048073e8602fe166e2487b1d87c18a0814d189))
- **ui:** refactor ConfigEditor to shadcn/ui, clean inline styles, fix build/tests & resolve all lints ([9c4db44](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/9c4db44b72f9e7a3e081524ffd25697f7441f80e))
- upgrade AI model, enhance AI prompting with reference artists, and introduce a playlist orchestrator with flexible track cleaning. ([cbdbf69](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/cbdbf69149b6d4c01f3696ab1b77958ba9e7b9dd))
- **web-app:** initialize frontend and refactor backend for secure curation ([9d6780e](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/9d6780e63c793d73f0f8aaf60e9d4d467c573e66))

### Bug Fixes

- **ci:** repair pipeline, enforce monorepo & strict local type-check ([6188996](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/61889967570ef779458a55a138b593132ce10c7d))
- fixed ci.yml workflow ([724c921](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/724c921421a51833b781057a1b883a37fecb0683))
- resolve tests, update docs, clean CI & reset deps ([50651c3](https://github.com/TommasoScalici/smart-spotify-playlist-curator/commit/50651c34d48d7894da516d100f485157dbdc86cf))
