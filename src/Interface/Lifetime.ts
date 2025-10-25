// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: Apache-2.0

import { isError, Result, ResultError } from '@gnuxie/typescript-result';
import { Logger } from '../Logging/Logger';

const log = new Logger('Lifetime');

export type LifetimeDisposeHandle = OwnLifetime | (() => void | Promise<void>);

export interface Lifetime {
  isInDisposal(): boolean;
  toChild(): OwnLifetime;
  forget(callback: LifetimeDisposeHandle): this;
}

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
 * - Constructors should expect an owner to be passed to them that they can use
 *   to request a child rather than a child. This is specifically so that
 *   leaks are not created by constructors that don't handle the children and
 *   forget to dispose them.
 *
 */
export interface OwnLifetime extends Lifetime {
  /**
   * We specifically provide a contract that this method will only exit
   * when all resources have cleaned up. And it is not possible to allocate
   * new resources once disposal has started.
   */
  [Symbol.asyncDispose](): Promise<void>;

  /** Use isInDisposal to check whether the resource is in disposal before using this method. */
  allocateResource<T>(
    factory: (lifetime: OwnLifetime) => T,
    disposer: (resource: T) => LifetimeDisposeHandle
  ): T;

  allocateResourceAsync<T>(
    factory: (lifetime: OwnLifetime) => Promise<Result<T>>,
    disposer: (resource: T) => LifetimeDisposeHandle
  ): Promise<Result<T>>;

  toAbortSignal(): AbortSignal;

  onDispose(callback: LifetimeDisposeHandle): this;

  /** Presents this Lifetime to a client who doesn't own it but wants to use it. */
  toLifetime(): Lifetime;
}

export type LifetimeOptions = {
  readonly parent?: OwnLifetime;
};

async function callDisposeHandle(handle: LifetimeDisposeHandle): Promise<void> {
  if (typeof handle === 'function') {
    await handle();
  } else {
    await handle[Symbol.asyncDispose]();
  }
}

export class StandardLifetime implements OwnLifetime {
  private readonly controller = new AbortController();
  private readonly callbacks = new Set<LifetimeDisposeHandle>();
  private readonly disposedPromise: Promise<void>;
  private resolveDisposed: undefined | (() => void) = undefined;
  private readonly parent: OwnLifetime | undefined;

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

  public toChild(): OwnLifetime {
    return new StandardLifetime({ parent: this });
  }

  allocateResource<T>(
    factory: (lifetime: OwnLifetime) => T,
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

  async withDisposalBlocked<T>(
    cb: () => Promise<Result<T>>
  ): Promise<Result<T>> {
    if (this.isInDisposal()) {
      return ResultError.Result(
        'Lifetime is in disposal, so disposal cannot be blocked'
      );
    }
    const blockingPromise = cb();
    const handle = () => blockingPromise.then(() => {});
    this.onDispose(handle);
    try {
      return await blockingPromise;
    } finally {
      this.forget(handle);
    }
  }

  async allocateResourceAsync<T>(
    factory: (lifetime: OwnLifetime) => Promise<Result<T>>,
    disposer: (resource: T) => LifetimeDisposeHandle
  ): Promise<Result<T>> {
    return await this.withDisposalBlocked(async () => {
      const resource = await factory(this);
      if (isError(resource)) {
        return resource;
      }
      if (this.isInDisposal()) {
        await callDisposeHandle(disposer(resource.ok));
        return ResultError.Result(
          'Resource had to be disposed after allocation because Lifetime entered disposal'
        );
      } else {
        this.onDispose(disposer(resource.ok));
        return resource;
      }
    });
  }

  public toLifetime(): Lifetime {
    return this;
  }
}

// We should also allow these to be branded by layer e.g. protections
// can only register against that. And not accidentally the protection manager.

// We then probably also need an interface specific for things allocating
// e.g. AllocatableLifetime.
