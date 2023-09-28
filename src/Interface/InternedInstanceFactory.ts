/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 */

import { ActionResult, Ok, isError } from './Action';

export class InternedInstanceFactory<
  K,
  V,
  AdditionalCreationArguments extends unknown[]
> {
  private readonly instances = new Map<K, V>();
  public constructor(
    private readonly createInstanceFromKey: (
      key: K,
      ...args: AdditionalCreationArguments
    ) => Promise<ActionResult<V>>
  ) {
    // nothing to do.
  }

  public async getInstance(
    key: K,
    ...args: AdditionalCreationArguments
  ): Promise<ActionResult<V>> {
    const instance = this.instances.get(key);
    if (instance !== undefined) {
      return Ok(instance);
    }
    // then intern the list
    const initialInstanceResult = await this.createInstanceFromKey(
      key,
      ...args
    );
    if (isError(initialInstanceResult)) {
      return initialInstanceResult;
    }
    // FIXME: there is potential for race if the same list is asked for in two places
    // very bad please fix with an await lock.
    // could also be fixed by populating with the blank revision first and then
    // revising it asynchrnously, but that would be bad too.
    // actually forget that, i don't think it'd work either because of event loop scheduling.
    this.instances.set(key, initialInstanceResult.ok);
    return Ok(initialInstanceResult.ok);
  }
}
