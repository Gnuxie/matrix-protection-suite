// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: Apache-2.0

import { Logger } from '../Logging/Logger';

const log = new Logger('Lifetime');

export type LifetimeDisposeHandle = Lifetime | (() => void | Promise<void>);

/**
 * Lifetime is an abstraction that provides structured ownership, cancellation,
 * and cleanup of resources.
 *
 * The Lifetime can also be used to cancel asynchronous operations, such as IO,
 * timeouts, or lock acquisition.
 *
 * We also offer compatibility with `AbortSignal` which allows the Lifetime
 * to be used directly with APIs that support AbortSignal instead. Note:
 * AbortSignal does not support awaiting for cleanup to finish.
 *
 * Lifecycle:
 * - [Symbol.asyncDispose] must be called to dispose the object.
 * - Resources MUST register with a Lifetime atomically as a part of resource
 *   allocation. Resources MUST fail to allocate if the Lifetime is already in disposal.
 *   Use allocateResource.
 */
export interface Lifetime {
  isInDisposal(): boolean;
  onDispose(callback: LifetimeDisposeHandle): this;
  toAbortSignal(): AbortSignal;
  [Symbol.asyncDispose](): Promise<void>;
  toChild(): Lifetime;
  forget(callback: LifetimeDisposeHandle): this;
  /** Use isInDisposal to check whether the resource is in disposal before using this method. */
  allocateResource<T>(
    factory: (lifetime: Lifetime) => T,
    disposer: (resource: T) => LifetimeDisposeHandle
  ): T;
}

export type LifetimeOptions = {
  readonly parent?: Lifetime;
};

async function callDisposeHandle(handle: LifetimeDisposeHandle): Promise<void> {
  if (typeof handle === 'function') {
    await handle();
  } else {
    await handle[Symbol.asyncDispose]();
  }
}

export class StandardLifetime implements Lifetime {
  private readonly controller = new AbortController();
  private readonly callbacks = new Set<LifetimeDisposeHandle>();
  private readonly disposedPromise: Promise<void>;
  private resolveDisposed: undefined | (() => void) = undefined;
  private readonly parent: Lifetime | undefined;

  public constructor(options: LifetimeOptions = {}) {
    this.parent = options.parent;
    this.parent?.onDispose(this);
    this.disposedPromise = new Promise((resolve) => {
      this.resolveDisposed = resolve;
    });
  }

  public isInDisposal() {
    return this.controller.signal.aborted;
  }

  public onDispose(callback: LifetimeDisposeHandle): this {
    if (this.isInDisposal()) {
      throw new TypeError(
        'You are registering a resource with the Lifetime non atomically. You must only register resources immediately and atomically with resource allocation. Use the allocateResource method.'
      );
    } else {
      this.callbacks.add(callback);
      return this;
    }
  }

  public forget(callback: LifetimeDisposeHandle): this {
    // we don't want to delete something we are in the process of disposing.
    if (this.isInDisposal()) {
      return this;
    }
    this.callbacks.delete(callback);
    return this;
  }

  public toAbortSignal(): AbortSignal {
    return this.controller.signal;
  }

  public async [Symbol.asyncDispose](): Promise<void> {
    if (this.isInDisposal()) {
      return this.disposedPromise;
    }
    this.controller.abort();
    for (const callback of this.callbacks) {
      try {
        await callDisposeHandle(callback);
      } catch (error) {
        log.error('Error during disposal callback', error);
      }
    }
    this.callbacks.clear();
    this.parent?.forget(this);
    if (this.resolveDisposed === undefined) {
      // It's possible that dispose has been called when there are no callbacks.
      // If we process this in the next tick the resolver should have been
      // assigned by that point.
      return new Promise((resolve, reject) => {
        if (this.resolveDisposed === undefined) {
          reject(
            new TypeError(
              'resolveDisposed is undefined during disposal. This should not be possible.'
            )
          );
          return;
        } else {
          this.resolveDisposed();
          resolve();
        }
      });
    }
    this.resolveDisposed();
  }

  public toChild(): Lifetime {
    return new StandardLifetime({ parent: this });
  }

  allocateResource<T>(
    factory: (lifetime: Lifetime) => T,
    disposer: (resource: T) => LifetimeDisposeHandle
  ): T {
    if (this.isInDisposal()) {
      throw new TypeError(
        'Resource was not initialized: Lifetime is in disposal. Use isInDisposal to check before using this method.'
      );
    }
    const resource = factory(this);
    this.onDispose(disposer(resource));
    return resource;
  }
}
