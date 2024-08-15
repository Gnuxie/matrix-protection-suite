// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { isError } from '@gnuxie/typescript-result';
import { StaticDecode, Type } from '@sinclair/typebox';
import { MatrixRoomReference } from '@the-draupnir-project/matrix-basic-types';

export const PermalinkSchema = Type.Transform(Type.String())
  .Decode((value) => {
    const permalinkResult = MatrixRoomReference.fromPermalink(value);
    if (isError(permalinkResult)) {
      throw new TypeError(permalinkResult.error.message);
    } else {
      return permalinkResult.ok;
    }
  })
  .Encode((value) => value.toPermalink());

export type PermalinkSchema = StaticDecode<typeof PermalinkSchema>;
