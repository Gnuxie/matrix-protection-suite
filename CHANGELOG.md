<!--
SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>

SPDX-License-Identifier: CC-BY-SA-4.0
-->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.1] - 2025-01-14

### Fixed

- An issue with the `SetRoomMembershipRevisionIssuer` that would allow
  duplicate listeners to be added to rooms that were already in the
  set. This would cause lots of issues with downstream revision
  listeners. We've hardened code downstream, e.g.  with the
  `MembershipPolicyRevisionIssuer`, in case this happens again.

## [2.5.0] - 2025-01-12

### Added

- `RoomInviter` to `ClientPlatform`.

## [2.4.0] - 2025-01-10

### Fixed

- `StandardProtectionsConfig` now uses the provided
  `SchemedDataManager` to persist the config while disabling
  protections.  This was a bug, it was always supposed to use the
  `SchemedDataManager` to persist the version number alongside the
  serialized data. Fixes
  https://github.com/the-draupnir-project/Draupnir/issues/560.

- The `SynapseAdminReport['name']` property is now appropriately
  unioned with `null`.

### Added

- The `user_id` field is now present on the `SynapseAdminReport`
  schema.

- Access to unique member count of `SetMembership` via
  `SetMembership['uniqueMemberCount']`.

## [2.3.0] - 2025-01-08

### Added

- `SchemaMigration` now provides the schema version number to use
  rather than relying on deltas to hand type the number and mess up.

### Changed

- Interface of `ServerConsequences['consequenceForServersInRoom']` has
  changed so that it is possible to determine if any changes/effects
  have been made after calling. Changed to support
  https://github.com/the-draupnir-project/Draupnir/issues/450.

- The `ServerACLEvent` Schema wrongly described `content` as optional.


### Fixed

- There was a bug where unwatching a list would cause only the list
  you wanted to unwatch to become
  watched. https://github.com/the-draupnir-project/Draupnir/issues/647.

- Getting the name of the capability wrong for capability context glue
  will now result in an error.

## [2.2.0] - 2025-01-06

### Added

* `SetMembershipRevision` for calculating whether a Matrix user is the
  member of any room in a set of rooms.

* `MembershipPolicyRevision` for easily finding policy rules that
  match users within a `SetMembershipRevision`. This revision stops
  protections or capabilities from needing to calculate matches
  themselves.

### Fixed

- `DirectPolicyListRevisionIssuer` now emits the `'revision'` event
  when policy rooms are watched and unwatched.

### Changed

- `UserConsequences` now accepts an argument for `TargetMember[]` rather
  than a `PolicyListRevision`, so that it can be used in conjunction with
  the new `MembershipPolicyRevision`.

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
