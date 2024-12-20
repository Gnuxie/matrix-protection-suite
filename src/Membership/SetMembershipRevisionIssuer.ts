// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { SetMembershipRevision } from "./SetMembershipRevision";

export type SetMembershipRevisionListener = (

) => void;

export interface SetMembershipRevisionIssuer {
  readonly currentRevision: SetMembershipRevision;
  on(event: 'revision', )
}
