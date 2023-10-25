/**
 * Copyright (C) 2022 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 *
 * However, this file is modified and the modifications in this file
 * are NOT distributed, contributed, committed, or licensed under the Apache License.
 */

import { MatrixGlob } from './MatrixGlob';

export interface ServerACLContent {
  allow: string[];
  deny: string[];
  allow_ip_literals: boolean;
}

export class ServerACLBuilder {
  private allowedServers: Set<string> = new Set<string>();
  private deniedServers: Set<string> = new Set<string>();
  private allowIps = false;

  public constructor(public readonly homeserver: string) {}

  /**
   * Checks the ACL for any entries that might ban ourself.
   * @returns A list of deny entries that will not ban our own homeserver.
   */
  public safeDeniedServers(): string[] {
    // The reason we do this check here rather than in the `denyServer` method
    // is because `literalAclContent` exists and also we want to be defensive about someone
    // mutating `this.deniedServers` via another method in the future.
    const entries: string[] = [];
    for (const server of this.deniedServers) {
      const glob = new MatrixGlob(server);
      if (!glob.test(this.homeserver)) {
        entries.push(server);
      }
    }
    return entries;
  }

  public allowIpAddresses(): ServerACLBuilder {
    this.allowIps = true;
    return this;
  }

  public denyIpAddresses(): ServerACLBuilder {
    this.allowIps = false;
    return this;
  }

  public allowServer(glob: string): ServerACLBuilder {
    this.allowedServers.add(glob);
    return this;
  }

  public setAllowedServers(globs: string[]): ServerACLBuilder {
    this.allowedServers = new Set<string>(globs);
    return this;
  }

  public denyServer(glob: string): ServerACLBuilder {
    this.deniedServers.add(glob);
    return this;
  }

  public setDeniedServers(globs: string[]): ServerACLBuilder {
    this.deniedServers = new Set<string>(globs);
    return this;
  }

  public literalAclContent(): ServerACLContent {
    return {
      allow: [...this.allowedServers],
      deny: [...this.deniedServers],
      allow_ip_literals: this.allowIps,
    };
  }

  public safeAclContent(): ServerACLContent {
    const allowed = [...this.allowedServers];
    if (!allowed || allowed.length === 0) {
      allowed.push('*'); // allow everything
    }
    return {
      allow: allowed,
      deny: this.safeDeniedServers(),
      allow_ip_literals: this.allowIps,
    };
  }

  public matches(acl: ServerACLContent): boolean {
    if (!acl) return false;

    const allow = acl['allow'];
    const deny = acl['deny'];
    const ips = acl['allow_ip_literals'];

    let allowMatches = true; // until proven false
    let denyMatches = true; // until proven false
    const ipsMatch = ips === this.allowIps;

    const currentAllowed = [...this.allowedServers];
    if (allow.length === currentAllowed.length) {
      for (const s of allow) {
        if (!currentAllowed.includes(s)) {
          allowMatches = false;
          break;
        }
      }
    } else allowMatches = false;

    const currentDenied = [...this.deniedServers];
    if (deny.length === currentDenied.length) {
      for (const s of deny) {
        if (!currentDenied.includes(s)) {
          denyMatches = false;
          break;
        }
      }
    } else denyMatches = false;

    return denyMatches && allowMatches && ipsMatch;
  }
}
