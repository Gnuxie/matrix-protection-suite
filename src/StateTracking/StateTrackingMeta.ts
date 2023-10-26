/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { ActionResult } from '../Interface/Action';
import { StringEventID } from '../MatrixTypes/StringlyTypedMatrix';
import { Map as PersistentMap, Set as PersistentSet } from 'immutable';

export interface StateTrackingMeta {
  storedStateTypes: string[];
  informOfChangeOnlyStateTypes: string[];
  getInformOnlyStateType(type: string): string | undefined;
  setInformOnlyStateType(type: string): StateTrackingMeta;
  setStoredStateType(type: string): StateTrackingMeta;
  getStoredStateType(string: string): string | undefined;
  setDecoderForStateType(
    type: string,
    decoder: StateEventDecoder
  ): StateTrackingMeta;
  getDecoderForStateType(type: string): StateEventDecoder | undefined;
}

export interface TrackedStateEvent {
  event_id: StringEventID;
  type: string;
  state_key: string;
}

type StateEventDecoder = (event: unknown) => ActionResult<TrackedStateEvent>;

export class StandardStateTrackingMeta implements StateTrackingMeta {
  public constructor(
    private readonly storedStateTypesSet = PersistentSet<string>(),
    private readonly informOfChangeOnlyStateTypesSet = PersistentSet<string>(),
    private readonly decodersByType = PersistentMap<string, StateEventDecoder>()
  ) {
    // nothing to do.
  }

  public get storedStateTypes(): string[] {
    return [...this.storedStateTypesSet];
  }
  public get informOfChangeOnlyStateTypes(): string[] {
    return [...this.informOfChangeOnlyStateTypesSet];
  }
  getStoredStateType(type: string): string | undefined {
    return this.storedStateTypesSet.has(type) ? type : undefined;
  }
  getInformOnlyStateType(type: string): string | undefined {
    return this.informOfChangeOnlyStateTypesSet.has(type) ? type : undefined;
  }
  getDecoderForStateType(type: string): StateEventDecoder | undefined {
    return this.decodersByType.get(type);
  }
  setInformOnlyStateType(type: string): StateTrackingMeta {
    return new StandardStateTrackingMeta(
      this.storedStateTypesSet,
      this.informOfChangeOnlyStateTypesSet.add(type),
      this.decodersByType
    );
  }
  setStoredStateType(type: string): StateTrackingMeta {
    return new StandardStateTrackingMeta(
      this.storedStateTypesSet.add(type),
      this.informOfChangeOnlyStateTypesSet,
      this.decodersByType
    );
  }

  setDecoderForStateType(
    type: string,
    decoder: StateEventDecoder
  ): StateTrackingMeta {
    return new StandardStateTrackingMeta(
      this.storedStateTypesSet,
      this.informOfChangeOnlyStateTypesSet,
      this.decodersByType.set(type, decoder)
    );
  }
}
