// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: Apache-2.0

import { Ok, Result } from '@gnuxie/typescript-result';
import { SemanticType } from '../../Interface/SemanticType';
import {
  AllocatableLifetime,
  StandardLifetime,
} from '../../Interface/Lifetime';
import {
  AnyHandleDescription,
  HandleDataSourceType,
  HandleDescription,
  PluginWithHandle,
} from './HandleDescription';

export interface HandleRegistry<THandles extends AnyHandleDescription = never> {
  registerHandleDescription<THandleDescription extends AnyHandleDescription>(
    description: THandleDescription
  ): Result<HandleRegistry<THandles | THandleDescription>>;
  registerPluginHandles(
    plugin: PluginWithHandle<THandles>,
    pluginLifetime: AllocatableLifetime<typeof plugin>
  ): Result<HandleRegistry<THandles>>;
  removePluginHandles(plugin: PluginWithHandle<THandles>): void;
  [Symbol.asyncDispose](): Promise<void>;
}

export const HandleRegistrySemantics = SemanticType<HandleRegistry>(
  'HandleRegistry'
).Law({
  establishHandles: {
    what: 'When registerHandles is called, plugins will later receive calls for their handles',
    why: 'Provides the hook point for plugins to register with handles',
    law: 'For plugin P and handle H, registering plugin will result in handle H being called on plugin when invoked',
    async check(makeSubject) {
      type EstablishHandlesDescription = HandleDescription<
        'testHandle',
        Record<string, unknown>,
        () => void
      >;
      let publishHandleCallback:
        | ((handleName: 'testHandle') => void)
        | undefined;
      let handleInvocations = 0;
      const testHandleDescription: EstablishHandlesDescription = {
        handleName: 'testHandle',
        dataSourceType: HandleDataSourceType.Context,
        establish(_context, callback) {
          publishHandleCallback = callback;
          return Ok(undefined);
        },
      };
      const testPlugin = {
        testHandle() {
          handleInvocations += 1;
        },
      };
      const lifetime = new StandardLifetime<typeof testPlugin>();
      (await makeSubject())
        .expect('registry creation failed')
        .registerHandleDescription(testHandleDescription)
        .expect('Should be able to establish the handle description')
        .registerPluginHandles(testPlugin, lifetime);
      if (publishHandleCallback === undefined) {
        throw new TypeError(
          'Handle establishment did not provide a publish callback'
        );
      }
      publishHandleCallback('testHandle');
      if (handleInvocations !== 1) {
        throw new TypeError('Registered handle was not invoked after publish');
      }
    },
  },
  unaryHandleRegistration: {
    what: 'Plugin registration is unary, handles will not be called multiple times as a result of multiple registration',
    why: 'Prevents bugs from multiple registration',
    law: 'For a plugin P, and handle H, calling registerHandles(P) twice will result in H of P being called exactly once only',
    async check(makeSubject) {
      type UnaryHandlesDescription = HandleDescription<
        'testHandle',
        Record<string, unknown>,
        () => void
      >;
      let publishHandleCallback:
        | ((handleName: 'testHandle') => void)
        | undefined;
      let handleInvocations = 0;
      const testHandleDescription: UnaryHandlesDescription = {
        handleName: 'testHandle',
        dataSourceType: HandleDataSourceType.Context,
        establish(_context, callback) {
          publishHandleCallback = callback;
          return Ok(undefined);
        },
      };
      const testPlugin = {
        testHandle() {
          handleInvocations += 1;
        },
      };
      const lifetime = new StandardLifetime<typeof testPlugin>();
      (await makeSubject())
        .expect('registry creation failed')
        .registerHandleDescription(testHandleDescription)
        .expect('Should be able to establish the handle description')
        .registerPluginHandles(testPlugin, lifetime)
        .expect('should be able to register handles')
        .registerPluginHandles(testPlugin, lifetime)
        .expect('should be able to register handles');
      if (publishHandleCallback === undefined) {
        throw new TypeError(
          'Handle establishment did not provide a publish callback'
        );
      }
      publishHandleCallback('testHandle');
      if (handleInvocations !== 1) {
        throw new TypeError(
          'Registered handle was invoked more than once after duplicate registrations'
        );
      }
    },
  },
  pluginUnRegistration: {
    what: 'Handles will no longer be called on plugins that are unregistered',
    why: 'Make sure that plugins can be cleanly removed from the system',
    law: 'For plugin P and handle H, after unregistering P, H will no longer be called on P',
    async check(makeSubject) {
      type UnregisterDescription = HandleDescription<
        'testHandle',
        Record<string, unknown>,
        () => void
      >;
      let publishHandleCallback:
        | ((handleName: 'testHandle') => void)
        | undefined;
      let handleInvocations = 0;
      const testHandleDescription: UnregisterDescription = {
        handleName: 'testHandle',
        dataSourceType: HandleDataSourceType.Context,
        establish(_context, callback) {
          publishHandleCallback = callback;
          return Ok(undefined);
        },
      };
      const testPlugin = {
        testHandle() {
          handleInvocations += 1;
        },
      };
      const lifetime = new StandardLifetime<typeof testPlugin>();
      const registry = (await makeSubject())
        .expect('registry creation failed')
        .registerHandleDescription(testHandleDescription)
        .expect('Should be able to establish the handle description')
        .registerPluginHandles(testPlugin, lifetime)
        .expect('should be able to register handles');
      registry.removePluginHandles(testPlugin);
      if (publishHandleCallback === undefined) {
        throw new TypeError(
          'Handle establishment did not provide a publish callback'
        );
      }
      publishHandleCallback('testHandle');
      if (handleInvocations !== 0) {
        throw new TypeError('Handle was invoked after plugin was unregistered');
      }
    },
  },
  disposable: {
    what: 'HandleRegistry un-registers all plugins on disposal',
    why: 'Prevents resource leaks from HandleRegistry instances',
    law: 'For plugin P and handle H, after disposing the HandleRegistry, H will no longer be called on P',
    async check(makeSubject) {
      type DisposableDescription = HandleDescription<
        'testHandle',
        Record<string, unknown>,
        () => void
      >;
      let publishHandleCallback:
        | ((handleName: 'testHandle') => void)
        | undefined;
      let handleInvocations = 0;
      const testHandleDescription: DisposableDescription = {
        handleName: 'testHandle',
        dataSourceType: HandleDataSourceType.Context,
        establish(_context, callback) {
          publishHandleCallback = callback;
          return Ok(undefined);
        },
      };
      const testPlugin = {
        testHandle() {
          handleInvocations += 1;
        },
      };
      const lifetime = new StandardLifetime<typeof testPlugin>();
      const registry = (await makeSubject())
        .expect('registry creation failed')
        .registerHandleDescription(testHandleDescription)
        .expect('Should be able to establish the handle description')
        .registerPluginHandles(testPlugin, lifetime)
        .expect('should be able to register handles');
      await registry[Symbol.asyncDispose]();
      if (publishHandleCallback === undefined) {
        throw new TypeError(
          'Handle establishment did not provide a publish callback'
        );
      }
      try {
        publishHandleCallback('testHandle');
      } catch (e) {
        // Swallow errors from invoking after disposal.
      }
      if (handleInvocations !== 0) {
        throw new TypeError('Handle was invoked after HandleRegistry disposal');
      }
    },
  },
});
