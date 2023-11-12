/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { StringEventID } from '../MatrixTypes/StringlyTypedMatrix';
import { Set as PersistentSet } from 'immutable';

export interface StateTrackingMeta {
  storedStateTypes: string[];
  informOfChangeOnlyStateTypes: string[];
  getInformOnlyStateType(type: string): string | undefined;
  setInformOnlyStateType(type: string): StateTrackingMeta;
  setStoredStateType(type: string): StateTrackingMeta;
  getStoredStateType(string: string): string | undefined;
}

export interface TrackedStateEvent {
  event_id: StringEventID;
  type: string;
  state_key: string;
}

export class StandardStateTrackingMeta implements StateTrackingMeta {
  public constructor(
    private readonly storedStateTypesSet = PersistentSet<string>(),
    private readonly informOfChangeOnlyStateTypesSet = PersistentSet<string>()
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
  setInformOnlyStateType(type: string): StateTrackingMeta {
    return new StandardStateTrackingMeta(
      this.storedStateTypesSet,
      this.informOfChangeOnlyStateTypesSet.add(type)
    );
  }
  setStoredStateType(type: string): StateTrackingMeta {
    return new StandardStateTrackingMeta(
      this.storedStateTypesSet.add(type),
      this.informOfChangeOnlyStateTypesSet
    );
  }
}
