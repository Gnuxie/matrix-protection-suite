/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { Type } from '@sinclair/typebox';
import { ActionResult } from '../Interface/Action';
import { Value } from '../Interface/Value';
import { StateEvent } from '../MatrixTypes/Events';
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
  decodeStateEvent(event: unknown): ActionResult<StateEvent>;
}

export interface TrackedStateEvent {
  event_id: StringEventID;
  type: string;
  state_key: string;
}

type StateEventDecoder = (event: unknown) => ActionResult<StateEvent>;

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

  public decodeStateEvent(event: unknown): ActionResult<StateEvent> {
    if (
      event === null ||
      typeof event !== 'object' ||
      !('type' in event) ||
      typeof event['type'] !== 'string'
    ) {
      throw new TypeError(
        `Somehow there's malformed events being given by the homeserver.`
      );
    }
    const decoder = this.decodersByType.get(event.type);
    if (decoder === undefined) {
      return Value.Decode(UnknownStateEvent, event);
    } else {
      return decoder(event);
    }
  }
}

const UnknownStateEvent = StateEvent(Type.Unknown());
