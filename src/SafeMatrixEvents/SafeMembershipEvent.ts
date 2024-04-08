// Copyright 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionResult, Ok, isOk } from '../Interface/Action';
import { DecodeException, Value } from '../Interface/Value';
import { MembershipEventContent } from '../MatrixTypes/MembershipEvent';
import { ValuePointer } from '@sinclair/typebox/value';

/**
 * Used by the `SafeMembershipEventMirror` to extract unsafe content from an event.
 */
export const UnsafeContentKey = Symbol('unsafeContent');
/**
 * Used by the `SafeMembershipEventMirror` to determine if an object is `SafeMembershipEventContent`.
 */
const SafeMembershipEventContentKey = Symbol('SafeMembershipEventContent');

export interface SafeMembershipEventContent extends MembershipEventContent {
  [UnsafeContentKey]?: Record<string, unknown>;
  [SafeMembershipEventContentKey]: true;
}

export const SafeMembershipEventMirror = Object.freeze({
  getUnsafeContent(
    content: SafeMembershipEventContent
  ): Record<string, unknown> | undefined {
    return content[UnsafeContentKey];
  },
  isSafeContent(content: unknown): content is SafeMembershipEventContent {
    return (
      typeof content === 'object' &&
      content !== null &&
      SafeMembershipEventContentKey in content
    );
  },
  /**
   * Create `SafeMembershipEventContent` from valid content and unsafe content.
   */
  create(
    content: MembershipEventContent,
    {
      unsafeContent = undefined,
    }: {
      unsafeContent?: SafeMembershipEventContent[typeof UnsafeContentKey];
    } = {}
  ): SafeMembershipEventContent {
    return {
      ...content,
      ...{
        [UnsafeContentKey]: unsafeContent,
        [SafeMembershipEventContentKey]: true,
      },
    };
  },
  /**
   * Parse unknown membership content into safe membership content, if possible.
   * @param unknownContent unknown content.
   * @returns An ActionResult with the safe content, or a reason why safe content cannot be created.
   */
  parse(
    unknownContent: Record<string, unknown>
  ): ActionResult<SafeMembershipEventContent, DecodeException> {
    const decodeResult = Value.Decode(MembershipEventContent, unknownContent, {
      suppressLogOnError: true,
    });
    if (isOk(decodeResult)) {
      return Ok(this.create(decodeResult.ok));
    } else {
      const unsafePropertyKeys = decodeResult.error.errors.map(
        (error) => ValuePointer.Format(error.path).next().value as string
      );
      if (unsafePropertyKeys.includes('membership')) {
        // this is a legitimatly unsafe event.
        return decodeResult;
      }
      const safeContent = Object.fromEntries(
        Object.entries(unknownContent).filter(
          ([key]) => !unsafePropertyKeys.includes(key)
        )
      );
      const unsafeContent = Object.fromEntries(
        Object.entries(unknownContent).filter(([key]) =>
          unsafePropertyKeys.includes(key)
        )
      );
      return Ok(
        this.create(safeContent as MembershipEventContent, {
          unsafeContent,
        })
      );
    }
  },
});

export type SafeMembershipEventMirror = typeof SafeMembershipEventMirror;
