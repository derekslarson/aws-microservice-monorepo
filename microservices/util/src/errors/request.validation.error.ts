import { RequestPortion } from "../enums/request.portion.enum";
import { BaseError } from "./base.error";

export class RequestValidationError extends BaseError {
  public validationErrors: { property: string, value: unknown; issues: string[]; }[];

  constructor(requestPortion: RequestPortion, validationErrors: { property: string, value: unknown; issues: string[]; }[]) {
    super(`Error validating ${requestPortion}.`);

    this.validationErrors = validationErrors;
  }
}
