<!--
SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>

SPDX-License-Identifier: CC-BY-SA-4.0
-->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
