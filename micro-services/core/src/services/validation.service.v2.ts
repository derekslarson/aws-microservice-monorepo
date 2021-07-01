import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Failcode, ValidationError } from "runtypes";
import { RuntypeBase } from "runtypes/lib/runtype";
import { TYPES } from "../inversion-of-control/types";
import { LoggerServiceInterface } from "./logger.service";
import { Request } from "../models/http/request.model";
import { ForbiddenError } from "../errors";

@injectable()
export class ValidationServiceV2 implements ValidationServiceV2Interface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) {}

  public validate<T, U extends boolean>(dto: RuntypeBase<T>, request: Request, getUserIdFromJwt?: U): ValidatedRequest<T, U> {
    try {
      this.loggerService.trace("validate called", { dto, request }, this.constructor.name);

      let jwtId: string | undefined;

      if (getUserIdFromJwt) {
        const rawUserId = request.requestContext.authorizer?.jwt.claims.sub;

        if (!rawUserId) {
          throw new ForbiddenError("Forbidden");
        }

        jwtId = `user-${rawUserId as string}`;
      }

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

      if (jwtId) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return { ...validatedRequest, jwtId } as ValidatedRequest<T, U>;
      }

      return validatedRequest as ValidatedRequest<T, U>;
    } catch (error: unknown) {
      this.loggerService.error("Error in validate", { error, dto, request }, this.constructor.name);

      if (error instanceof ValidationError) {
        throw error;
      }

      throw error;
    }
  }
}

type ValidatedRequest<T, U extends boolean> = U extends true ? (T & { jwtId: string; }) : T;

export interface ValidationServiceV2Interface {
  validate<T, U extends Request, V extends boolean>(dto: RuntypeBase<T>, request: U, getUserIdFromJwt?: V): ValidatedRequest<T, V>
}
