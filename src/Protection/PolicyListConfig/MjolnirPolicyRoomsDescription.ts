// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Type } from '@sinclair/typebox';
import { describeConfig } from '../../Config/describeConfig';
import { PermalinkSchema } from '../../MatrixTypes/PermalinkSchema';
import { EDStatic } from '../../Interface/Static';

export const MjolnirPolicyRoomsDescription = describeConfig({
  schema: Type.Object({
    references: Type.Array(PermalinkSchema, { default: [], uniqueItems: true }),
  }),
});

export type MjolnirPolicyRoomsDescriptionEvent = EDStatic<
  typeof MjolnirPolicyRoomsDescription.schema
>;