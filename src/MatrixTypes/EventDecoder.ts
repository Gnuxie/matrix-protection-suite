/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { Type } from '@sinclair/typebox';
import { ActionResult, isError } from '../Interface/Action';
import { DecodeException, Value } from '../Interface/Value';
import { RoomEvent, StateEvent } from './Events';
import { Map as PersistentMap } from 'immutable';
import { MembershipEvent } from './MembershipEvent';
import { ALL_RULE_TYPES, PolicyRuleEvent } from './PolicyEvents';
import { RoomMessage } from './RoomMessage';
import { ReactionEvent } from './ReactionEvent';

type EventDecoderFn = (
  event: unknown
) => ActionResult<RoomEvent, DecodeException>;

/**
 * A compomenet used by clients to parse events.
 */
export interface EventDecoder {
  /**
   * Set the parser for the given event type.
   * @param type The type that should use the parser.
   * @param decoder The parser for the event type.
   * @returns A new EventDecoder that contains the new decoder.
   */
  setDecoderForEventType(type: string, decoder: EventDecoderFn): EventDecoder;
  getDecoderForEventType(type: string): EventDecoderFn | undefined;
  decodeEvent(event: unknown): ActionResult<RoomEvent, DecodeException>;
  decodeStateEvent(event: unknown): ActionResult<StateEvent, DecodeException>;
}

export class StandardEventDecoder implements EventDecoder {
  private constructor(
    private readonly decodersByType = PersistentMap<string, EventDecoderFn>()
  ) {
    // nothing to do.
  }

  public static blankEventDecoder(): EventDecoder {
    return new StandardEventDecoder(PersistentMap());
  }

  getDecoderForEventType(type: string): EventDecoderFn | undefined {
    return this.decodersByType.get(type);
  }

  public setDecoderForEventType(
    type: string,
    decoder: EventDecoderFn
  ): EventDecoder {
    return new StandardEventDecoder(this.decodersByType.set(type, decoder));
  }

  public decodeEvent(event: unknown): ActionResult<RoomEvent, DecodeException> {
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
      return Value.Decode(UnknownEvent, event);
    } else {
      return decoder(event);
    }
  }
  public decodeStateEvent(
    event: unknown
  ): ActionResult<StateEvent, DecodeException> {
    const result = this.decodeEvent(event);
    if (isError(result)) {
      return result;
    } else if (
      'state_key' in result.ok &&
      typeof result.ok.state_key === 'string'
    ) {
      return result as ActionResult<StateEvent, DecodeException>;
    }
    throw new TypeError('Somehow decoded a state event without a state key');
  }
}

const UnknownEvent = RoomEvent(Type.Unknown());

export let DefaultEventDecoder = StandardEventDecoder.blankEventDecoder()
  .setDecoderForEventType('m.room.member', (event) =>
    Value.Decode(MembershipEvent, event)
  )
  .setDecoderForEventType('m.room.message', (event) =>
    Value.Decode(RoomMessage, event)
  )
  .setDecoderForEventType('m.reaction', (event) =>
    Value.Decode(ReactionEvent, event)
  );

function decodePolicyEvent(event: unknown) {
  return Value.Decode(PolicyRuleEvent, event);
}

for (const type of ALL_RULE_TYPES) {
  DefaultEventDecoder = DefaultEventDecoder.setDecoderForEventType(
    type,
    decodePolicyEvent
  );
}
