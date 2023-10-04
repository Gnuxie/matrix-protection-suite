/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 */

import { ActionError, ActionResult, Ok, isError } from './Action';

// FIXME: We should accept a validator function for each schema
// e.g. like typebox so we can verify that stuff is correct.

export const SCHEMA_VERSION_KEY =
  'ge.applied-langua.ge.draupnir.schema_version';

export type RawSchemedData = object &
  Record<string, unknown> & { [SCHEMA_VERSION_KEY]: number };
export type SchemaMigration = (
  input: RawSchemedData
) => Promise<RawSchemedData>;
export type SchemaAssertion<T extends RawSchemedData = RawSchemedData> = (
  data: RawSchemedData
) => data is T;

export abstract class PersistentData<
  Format extends RawSchemedData = RawSchemedData
> {
  protected abstract upgradeSchema: SchemaMigration[];
  /**
   * Schema 0 can't really downgrade to anything so it has to be identity.
   */
  protected abstract downgradeSchema: SchemaMigration[];
  protected abstract isAllowedToInferNoVersionAsZero: boolean;
  protected abstract schemaAssertions: [
    ...SchemaAssertion[],
    SchemaAssertion<Format>
  ];
  /**
   * Request data from the persistent store.
   */
  protected abstract requestPersistentData(): Promise<ActionResult<unknown>>;
  /**
   * Store the data into the store.
   * @param data The data that will be stored.
   */
  protected abstract storePersistentData(
    data: Format
  ): Promise<ActionResult<void>>;
  /**
   * Create default data in the persistent store.
   * @returns newly created data that is already stored.
   */
  protected abstract createFirstData(): Promise<ActionResult<Format>>;

  /**
   * @param rawData Data that has just been requested from persistent storage.
   * @returns The data in the most recent format.
   */
  protected async upgradeDataToCurrentSchema(
    rawData: RawSchemedData
  ): Promise<RawSchemedData> {
    const startingVersion = rawData[SCHEMA_VERSION_KEY];
    // Rememeber, version 0 has no migrations
    if (this.upgradeSchema.length < startingVersion) {
      throw new TypeError(
        `Encountered a version that we do not have migrations for ${startingVersion}`
      );
    } else if (this.upgradeSchema.length === startingVersion) {
      return rawData;
    } else {
      const applicableSchema = this.upgradeSchema.slice(startingVersion);
      const migratedData = await applicableSchema.reduce(
        async (
          previousData: Promise<RawSchemedData>,
          schema: SchemaMigration
        ) => {
          return await schema(await previousData);
        },
        Promise.resolve(rawData)
      );
      return migratedData;
    }
  }

  /**
   * Downgrade data to a schema version.
   * @param rawData Data that has just been requested from a persistent store.
   * @param targetVersion The schema version to downgrade to.
   * @returns Data in the downgrdaded format matching the target version.
   */
  protected async downgradeDataToSchema(
    rawData: RawSchemedData,
    targetVersion: number
  ): Promise<RawSchemedData> {
    const currentVersion = rawData[SCHEMA_VERSION_KEY];
    if (currentVersion < targetVersion) {
      throw new TypeError(
        "We can't downgrade to a version that first requires upgrading to."
      );
    }
    if (this.downgradeSchema.length < currentVersion + 1) {
      throw new TypeError(
        `We can't downgrade because we don't have migrations for ${currentVersion}`
      );
    }
    if (currentVersion === targetVersion) {
      return rawData;
    }
    const applicableSchema = this.downgradeSchema
      .slice(targetVersion + 1, currentVersion + 1)
      .reverse();
    const migratedData = await applicableSchema.reduce(
      async (
        previousData: Promise<RawSchemedData>,
        schema: SchemaMigration
      ) => {
        return await schema(await previousData);
      },
      Promise.resolve(rawData)
    );
    return migratedData;
  }

  protected async loadData(): Promise<ActionResult<Format>> {
    const rawDataResult = await this.requestPersistentData();
    if (isError(rawDataResult)) {
      return rawDataResult;
    }
    const rawData = rawDataResult.ok;
    if (rawData === undefined) {
      return await this.createFirstData();
    } else if (typeof rawData !== 'object' || rawData === null) {
      throw new TypeError('The data has been corrupted.');
    }

    if (
      !(SCHEMA_VERSION_KEY in rawData) &&
      this.isAllowedToInferNoVersionAsZero
    ) {
      (rawData as RawSchemedData)[SCHEMA_VERSION_KEY] = 0;
    }
    if (
      SCHEMA_VERSION_KEY in rawData &&
      Number.isInteger(rawData[SCHEMA_VERSION_KEY])
    ) {
      const assertion = this.schemaAssertions.at(-1);
      if (assertion === undefined) {
        throw new TypeError("Assertions haven't been created for the Schema");
      }
      if (assertion(rawData as RawSchemedData)) {
        return Ok(
          await this.upgradeDataToCurrentSchema(rawData as Format)
        ) as ActionResult<Format>;
      } else {
        return ActionError.Result(
          'Persistent data is not in the expected format'
        );
      }
    }
    throw new TypeError('The schema version or data has been corrupted');
  }
}
