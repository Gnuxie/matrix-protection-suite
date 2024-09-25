import { Ok, Result, ResultError, isError } from "@gnuxie/typescript-result";
import { DynamicConfigDescription, UnknownConfig } from "./DynamicConfigDescription";
import { DynamicConfigProperty } from "./DynamicConfigProperty";
import { DynamicConfigJSONError, DynamicConfigParseError, DynamicConfigPropertyErrors } from "./DynamicConfigParseError";
import { DynamicConfigPropertyValidationError } from "./DynamicConfigPropertyValidationError";

export class StandardDynamicConfigDescription<
  TConfig extends UnknownConfig<string> = UnknownConfig<string>,
> implements DynamicConfigDescription<TConfig>
{
  private readonly descriptions: Map<
    keyof TConfig,
    DynamicConfigProperty<string, TConfig>
  > = new Map();
  public constructor(
    descriptions: Record<keyof TConfig, DynamicConfigProperty<string, TConfig>>,
    public readonly defaultValues: TConfig
  ) {
    for (const [key, setting] of Object.entries(descriptions)) {
      this.descriptions.set(key, setting);
    }
  }

  public setValue(
    settings: TConfig,
    key: keyof TConfig,
    value: unknown
  ): Result<TConfig> {
    const protectionSetting = this.descriptions.get(key);
    if (protectionSetting === undefined) {
      return ResultError.Result(
        `There is no setting available to set with the key ${String(key)}`
      );
    }
    return protectionSetting.setValue(settings, value);
  }

  parseConfig(settings: unknown): Result<TConfig, DynamicConfigParseError> {
    if (typeof settings !== 'object' || settings === null) {
      return DynamicConfigJSONError.Result(`The settings are corrupted.`, { json: JSON.stringify(settings), cause: null });
    }
    let parsedSettings = this.defaultValues;
    const errors: DynamicConfigPropertyValidationError[] = [];
    for (const setting of this.descriptions.values()) {
      if (setting.key in settings) {
        const result = setting.setValue(
          parsedSettings,
          (settings as TConfig)[setting.key]
        );
        if (isError(result)) {
          errors.push(result.error);
        } else {
          parsedSettings = result.ok;
        }
      }
    }
    if (errors.length > 0) {
      return DynamicConfigPropertyErrors.Result("One or more properties failed to parse", { config: this, properties: errors });
    }
    return Ok(parsedSettings);
  }

  toJSON(settings: TConfig): Record<string, unknown> {
    return [...this.descriptions.entries()].reduce(
      (acc, [key, setting]) => ({ [key]: setting.toJSON(settings), ...acc }),
      {}
    );
  }

  get valueDescriptions(): DynamicConfigProperty<string, TConfig>[] {
    return [...this.descriptions.values()];
  }

  getDescription(
    key: string
  ): DynamicConfigProperty<string, TConfig> | undefined {
    return this.descriptions.get(key);
  }
}
