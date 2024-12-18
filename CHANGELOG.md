<!--
SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>

SPDX-License-Identifier: CC-BY-SA-4.0
-->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2024-12-09

### Fixed

- A bug where `ConfigMirror['setValue']` would try encode a value that
  was already encoded.

## [2.1.0] - 2024-12-04

### Added

* Added a method to protections manager for changing a capability in a
  protection's capability set.
* Made capability provider set config actually persist by giving it a
  PersistentConfigBackend.

## [2.0.0] - 2024-11-26

### Changed

* `ProtectionsManager` depends on three different kinds of
  config. Config for capability providers, protection settings, and
  enabled protections.

### Removed

* `ProtectionSettings` are gone.

## [1.7.0] - 2024-10-10

### Added

* `JoinRulesEvent` and `JoinRulesEventContent` are now available to use.

## [1.6.0] - 2024-10-04

### Changed

* `ConfigParseError` and `ConfigPropertyError` now reference the
  relevant `ConfigDescription`.

## [1.5.2] - 2024-10-02

### Fixed

- Having valid but unjoinable rooms in `ProtectedRoomsConfig`
  is now a recoverable error.

## [1.5.1] - 2024-10-01

### Fixed

- Fixed a bug where the `MjolnirPolicyRoomsConfig` would show
  `undefined` in the description of `ConfigPropertyErrors`.

## [1.5.0] - 2024-10-01

### Added

- `PersistentConfigData` helper for dynamically editing schemed config
  files, and recovering from parse errors.

### Changed

- `MjolnirProtectedRoomsConfig`, `MjolnirWatchedListsConfig`,
  `MjolnirEnanbledProtections` have all been migrated to use
  `PersistentConfigData` with recovery options.


## [1.4.0] - 2024-09-11

### Changed

- Allow `RoomJoiner` to skip calling `/join`.

## [1.3.0] - 2024-09-11

### Changed

- Upgraded `@gnuxie/typescript-result`.
- Made `ActionException['toString']` clearer.
- Made it more clear which room is causing issues for the
  `ProtectedRoomsManager` as it is created.

## [1.2.0] - 2024-09-09

### Added

- `DeclareRoomState` and associated helpers are now exported.
- This includes the `describeProtectedRoomsSet` utility which easily allows
  you to fake a protected rooms set.

## [1.1.0] - 2024-08-26

### Added

- The `RoomMessageSender` capability is now available on `ClientPlatform`.

## [1.0.0] - 2024-08-16

### Changed

- The `Permalink` TypeBox Schema has been renamed to `PermalinkSchema`.

- I guess we're doing semver properly now? since weh.

## [0.24.0] - 2024-08-16

### Changed

- Depend upon `@the-draupnir-project/matrix-basic-types` to provide
  `StringUserID`, `MatrixRoomReference`, `MatrixGlob`, and associated
  types.

- Depend upon `@gnuxie/typescript-result` to provide `ActionResult`.
