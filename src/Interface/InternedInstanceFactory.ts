/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 */

import { ActionResult, Ok, isError } from './Action';

export type CreateInstanceFromKey<
  K,
  V,
  AdditionalCreationArguments extends unknown[]
> = (key: K, ...args: AdditionalCreationArguments) => Promise<ActionResult<V>>;

/**
 * This is a utility for any hash table that needs to create new values
 * from a `key`. The value will then be stored in the table and returned
 * each time the factory is then queried for that key.
 * This is mostly useful for singletons.
 * @typeParam AdditionalCreationArguments These are arguments that need to be
 * given to `createInstanceFromKey` when `getInstance` is called should a new
 * instance need to be created. Usually this would be some context like a matrix
 * client that can be used to fetch information.
 */
export class InternedInstanceFactory<
  K,
  V,
  AdditionalCreationArguments extends unknown[]
> {
  private readonly instances = new Map<K, V>();
  /**
   * Constructs the `InternedInstanceFactory`.
   * @param createInstanceFromKey A callable that will create new instances
   * from a key if the table doesn't have an entry for that key.
   */
  public constructor(
    private readonly createInstanceFromKey: CreateInstanceFromKey<
      K,
      V,
      AdditionalCreationArguments
    >
  ) {
    // nothing to do.
  }

  /**
   * Find an instance associated with the key.
   * @param key The key.
   * @param args Any arguments that need to be given to `createInstanceFromKey`
   * that was provided the constructor for `InternedInstanceFactory`.
   * @returns An associated instance for the key.
   */
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

  public hasInstance(key: K): boolean {
    return this.instances.has(key);
  }

  public getStoredInstance(key: K): V | undefined {
    return this.instances.get(key);
  }
}
