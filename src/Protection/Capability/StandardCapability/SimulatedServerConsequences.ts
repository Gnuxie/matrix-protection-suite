// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Ok, Result } from '@gnuxie/typescript-result';
import { RoomStateEventSender } from '../../../Client/RoomStateEventSender';
import { Capability, describeCapabilityProvider } from '../CapabilityProvider';
import {
  ServerACLConequences,
  ServerACLConsequencesContext,
} from './ServerACLConsequences';
import { ServerConsequences } from './ServerConsequences';
import { randomEventID } from '../../../TestUtilities/EventGeneration';
import { ProtectedRoomsSet } from '../../ProtectedRoomsSet';
import { StringRoomID } from '@the-draupnir-project/matrix-basic-types';
import { RoomSetResult } from './RoomSetResult';
import { PolicyListRevisionIssuer } from '../../../PolicyList/PolicyListRevisionIssuer';

const FakeStateSender = Object.freeze({
  sendStateEvent(_room, _stateType, _stateKey, _content) {
    return Promise.resolve(Ok(randomEventID()));
  },
} satisfies RoomStateEventSender);

export class SimulatedServerConsequences
  implements ServerConsequences, Capability
{
  public readonly requiredPermissions = [];
  public readonly requiredEventPermissions = [];
  public readonly requiredStatePermissions = [];
  public readonly isSimulated = true;
  private readonly simulatedCapability = new ServerACLConequences(
    FakeStateSender,
    this.protectedRoomsSet
  );
  public constructor(private readonly protectedRoomsSet: ProtectedRoomsSet) {
    // nothing to do.
  }
  public async consequenceForServersInRoom(
    roomID: StringRoomID,
    issuer: PolicyListRevisionIssuer
  ): Promise<Result<boolean>> {
    return await this.simulatedCapability.consequenceForServersInRoom(
      roomID,
      issuer
    );
  }
  public async consequenceForServersInRoomSet(
    issuer: PolicyListRevisionIssuer
  ): Promise<Result<RoomSetResult>> {
    return await this.simulatedCapability.consequenceForServersInRoomSet(
      issuer
    );
  }
  public async unbanServerFromRoomSet(
    serverName: string,
    reason: string
  ): Promise<Result<RoomSetResult>> {
    return await this.simulatedCapability.unbanServerFromRoomSet(
      serverName,
      reason
    );
  }
}

describeCapabilityProvider({
  name: 'SimulatedServerConsequences',
  description:
    'Simulates banning servers in protected rooms, but has no real effects',
  interface: 'ServerConsequences',
  isSimulated: true,
  factory(_description, context: ServerACLConsequencesContext) {
    return new SimulatedServerConsequences(context.protectedRoomsSet);
  },
});
