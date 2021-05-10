import { ValidateIf, ValidationOptions } from "class-validator";

export function IsOptionalIf(condition: (obj: Record<string, unknown>, value: unknown) => boolean, options?: ValidationOptions): PropertyDecorator {
  return ValidateIf((obj, value) => !condition(obj, value) || value != null, options);
}

// token change
