/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 */

// FIXME: We should accept a validator function for each schema
// e.g. like typebox so we can verify that stuff is correct.

export const SCHEMA_VERSION_KEY =
  'ge.applied-langua.ge.draupnir.schema_version';

export type RawSchemedData = object &
  Record<string, unknown> & { [SCHEMA_VERSION_KEY]: number };
export type SchemaMigration = (
  input: RawSchemedData
) => Promise<RawSchemedData>;
export type SchemaAssertion<T extends RawSchemedData> = (
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
  protected abstract requestPersistentData(): Promise<unknown>;
  protected abstract storeMatixData(data: Format): Promise<void>;
  protected abstract createFirstData(): Promise<Format>;

  protected async updateData(rawData: RawSchemedData): Promise<RawSchemedData> {
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

  protected async downgradeData(
    rawData: RawSchemedData,
    targetVersion: number
  ): Promise<RawSchemedData> {
    const currentVersion = rawData[SCHEMA_VERSION_KEY];
    if (currentVersion < targetVersion) {
      throw new TypeError(
        "We can't downgrade to a version that first requires upgrading to."
      );
    }
    if (this.downgradeData.length < currentVersion + 1) {
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

  protected async loadData(): Promise<Format> {
    const rawData = await this.requestPersistentData();
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
      // what if the schema migration is somehow incorrect and we are casting as Format?
      return (await this.updateData(rawData as RawSchemedData)) as Format;
    }
    throw new TypeError('The schema version or data has been corrupted');
  }
}
