import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Failcode, ValidationError } from "runtypes";
import { RuntypeBase } from "runtypes/lib/runtype";
import { TYPES } from "../inversion-of-control/types";
import { LoggerServiceInterface } from "./logger.service";
import { Request } from "../models/http/request.model";

@injectable()
export class ValidationServiceV2 implements ValidationServiceV2Interface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) {}

  public validate<T, U extends Request>(dto: RuntypeBase<T>, request: U): T {
    try {
      this.loggerService.trace("validate called", { dto, request }, this.constructor.name);

      let parsedBody: unknown;

      try {
        parsedBody = request.body && JSON.parse(request.body) as unknown;
      } catch (error: unknown) {
        throw new ValidationError({
          success: false,
          code: Failcode.VALUE_INCORRECT,
          message: "Error parsing body.",
          details: { body: "Malformed JSON" },
        });
      }

      const parsedRequest = {
        ...request,
        body: parsedBody,
      };

      const validatedRequest = dto.check(parsedRequest);

      return validatedRequest;
    } catch (error: unknown) {
      this.loggerService.error("Error in validate", { error, dto, request }, this.constructor.name);

      if (error instanceof ValidationError) {
        throw error;
      }

      throw error;
    }
  }
}

export interface ValidationServiceV2Interface {
  validate<T, U extends Request>(dto: RuntypeBase<T>, request: U): T
}
