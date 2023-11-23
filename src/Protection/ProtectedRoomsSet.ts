import { RoomEvent } from '../MatrixTypes/Events';
import { StringRoomID, StringUserID } from '../MatrixTypes/StringlyTypedMatrix';
import { SetMembership } from '../StateTracking/SetMembership';
import { PolicyListConfig } from './PolicyListConfig/PolicyListConfig';
import { ProtectedRoomsConfig } from './ProtectedRoomsConfig/ProtectedRoomsConfig';
import { ProtectionsConfig } from './ProtectionsConfig/ProtectionsConfig';

export interface ProtectedRoomsSet {
  readonly issuerManager: PolicyListConfig;
  readonly protectedRoomsConfig: ProtectedRoomsConfig;
  readonly protections: ProtectionsConfig;
  readonly setMembership: SetMembership;
  readonly userID: StringUserID;
  handleTimelineEvent(roomID: StringRoomID, event: RoomEvent): void;
  isProtectedRoom(roomID: StringRoomID): boolean;
}

export class StandardProtectedRoomsSet implements ProtectedRoomsSet {
  constructor(
    public readonly issuerManager: PolicyListConfig,
    public readonly protectedRoomsConfig: ProtectedRoomsConfig,
    public readonly protections: ProtectionsConfig,
    public readonly setMembership: SetMembership,
    public readonly userID: StringUserID
  ) {
    // nothing to do.
  }
  public handleTimelineEvent(_roomID: StringRoomID, _event: RoomEvent): void {
    // this should only be responsible for passing through to protections.
    // The RoomMembershipManage (and its dependants)
    // The PolicyListManager (and its dependents)
    // The RoomStateManager (and its dependents)
    // should get informed directly elsewhere, since there's no reason
    // they cannot be shared across protected rooms sets.
    // The only slightly dodgy thing about that is the PolicyListManager
    // can depend on the RoomStateManager but i don't suppose it'll matter
    // they both are programmed to de-duplicate repeat events.
    throw new TypeError('unimplemented.');
  }

  public isProtectedRoom(roomID: StringRoomID): boolean {
    return this.protectedRoomsConfig.isProtectedRoom(roomID);
  }
}
