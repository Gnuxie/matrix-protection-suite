// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

// For the love of god keep this in alphabetical order please.
export * from './Client/ClientPlatform';
export * from './Client/RoomBanner';
export * from './Client/RoomCreator';
export * from './Client/RoomEventRedacter';
export * from './Client/RoomJoiner';
export * from './Client/RoomKicker';
export * from './Client/RoomResolver';
export * from './Client/RoomStateEventSender';

export * from './ClientManagement/Client';
export * from './ClientManagement/ClientRooms';
export * from './ClientManagement/ClientsInRoomMap';
export * from './ClientManagement/JoinedRoomsRevision';
export * from './ClientManagement/RoomPauser';
export * from './ClientManagement/StandardClientRooms';

export * from './Interface/Action';
export * from './Interface/ActionException';
export * from './Interface/InternedInstanceFactory';
export * from './Interface/MatrixException';
export * from './Interface/MultipleErrors';
export * from './Interface/PersistentMatrixData';
export * from './Interface/RoomUpdateError';
export * from './Interface/SchemedMatrixData';
export * from './Interface/SimpleChangeType';
export * from './Interface/Task';
export * from './Interface/Value';

export * from './Logging/Logger';

export * from './MatrixTypes/SynapseAdmin/APIBodies';

export * from './MatrixTypes/CreateRoom';
export * from './MatrixTypes/EventDecoder';
export * from './MatrixTypes/Events';
export * from './MatrixTypes/MatrixEntity';
export * from './MatrixTypes/MatrixGlob';
export * from './MatrixTypes/MatrixRoomReference';
export * from './MatrixTypes/MembershipEvent';
export * from './MatrixTypes/Permalinks';
export * from './MatrixTypes/PolicyEvents';
export * from './MatrixTypes/PowerLevels';
export * from './MatrixTypes/ReactionEvent';
export * from './MatrixTypes/Redaction';
export * from './MatrixTypes/RoomMessage';
export * from './MatrixTypes/ServerACL';
export * from './MatrixTypes/ServerACLBuilder';
export * from './MatrixTypes/StringlyTypedMatrix';
export * from './MatrixTypes/SynapseReport';

export * from './Membership/MembershipChange';
export * from './Membership/MembershipRevision';
export * from './Membership/MembershipRevisionIssuer';
export * from './Membership/RoomMembershipManager';
export * from './Membership/RoomStateMembershipRevisionIssuer';
export * from './Membership/SetMembership';
export * from './Membership/StandardRoomMembershipRevision';
export * from './Membership/StandardRoomMembershipRevisionIssuer';
export * from './Membership/StandardSetMembershp';

export * from './PolicyList/PolicyListRevision';
export * from './PolicyList/PolicyListRevisionIssuer';
export * from './PolicyList/PolicyRoomEditor';
export * from './PolicyList/PolicyRoomManger';
export * from './PolicyList/PolicyRule';
export * from './PolicyList/PolicyRuleChange';
export * from './PolicyList/Revision';
export * from './PolicyList/RoomStatePolicyListRevisionIssuer';
export * from './PolicyList/StandardPolicyListRevision';
export * from './PolicyList/StandardPolicyRoomEditor';
export * from './PolicyList/StandardPolicyRoomRevision';
export * from './PolicyList/StandardPolicyRoomRevisionIssuer';

export * from './Protection/Consequence/Consequence';

export * from './Protection/PolicyListConfig/FakePolicyListConfig';
export * from './Protection/PolicyListConfig/MjolnirWatchedListsEvent';
export * from './Protection/PolicyListConfig/MjolnirPolicyRoomsConfig';
export * from './Protection/PolicyListConfig/PolicyListConfig';

export * from './Protection/ProtectedRoomsConfig/FakeProtectedRoomsConfig';
export * from './Protection/ProtectedRoomsConfig/MjolnirProtectedRoomsEvent';
export * from './Protection/ProtectedRoomsConfig/ProtectedRoomsConfig';

export * from './Protection/ProtectionsConfig/MjolnirProtectionsConfig';
export * from './Protection/ProtectionsConfig/ProtectionsConfig';

export * from './Protection/ProtectionSettings/ProtectionSetting';
export * from './Protection/ProtectionSettings/ProtectionSettings';
export * from './Protection/ProtectionSettings/SafeIntegerProtectionSetting';
export * from './Protection/ProtectionSettings/SetProtectionSetting';
export * from './Protection/ProtectionSettings/StringSetProtectionSetting';
export * from './Protection/ProtectionSettings/StringUserIDSetProtectionSetting';

export * from './Protection/StandardProtections/MemberBanSynchronisation';
export * from './Protection/StandardProtections/ServerBanSynchronisation';

export * from './Protection/AccessControl';

export * from './Protection/DirectPropagationPolicyListRevisionIssuer';
export * from './Protection/ProtectedRoomsSet';
export * from './Protection/Protection';

export * from './Reporting/EventReport';

export * from './StateTracking/EventBatch';
export * from './StateTracking/SetRoomState';
export * from './StateTracking/StandardRoomStateRevision';
export * from './StateTracking/StandardRoomStateRevisionIssuer';
export * from './StateTracking/StandardSetRoomState';
export * from './StateTracking/StateChangeType';
export * from './StateTracking/StateRevisionIssuer';
