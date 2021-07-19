import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Failcode, ValidationError } from "runtypes";
import { Runtype } from "runtypes/lib/runtype";
import { TYPES } from "../inversion-of-control/types";
import { LoggerServiceInterface } from "./logger.service";
import { Request } from "../models/http/request.model";
import { ForbiddenError } from "../errors";
import { ValidatedRequest } from "../types/validatedRequest.type";

@injectable()
export class ValidationServiceV2 implements ValidationServiceV2Interface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) {}

  public validate<T extends ValidatedRequest, U extends boolean>(params: ValidateInput<T, U>): ValidateOutput<T, U> {
    try {
      this.loggerService.trace("validate called", { params }, this.constructor.name);

      const { dto, request, getUserIdFromJwt } = params;

      let jwtId: `user-${string}` | undefined;

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
        pathParameters: {},
        queryStringParameters: {},
        ...request,
        body: parsedBody,
      };

      const validatedRequest = dto.check(parsedRequest);

      if (jwtId) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return { ...validatedRequest, jwtId } as ValidateOutput<T, U>;
      }

      return validatedRequest as ValidateOutput<T, U>;
    } catch (error: unknown) {
      this.loggerService.error("Error in validate", { error, params }, this.constructor.name);

      if (error instanceof ValidationError) {
        throw error;
      }

      throw error;
    }
  }
}

export interface ValidationServiceV2Interface {
  validate<T extends ValidatedRequest, U extends boolean>(params: ValidateInput<T, U>): ValidateOutput<T, U>
}

export interface ValidateInput<T extends ValidatedRequest, U extends boolean> {
  dto: Runtype<T>;
  request: Request;
  getUserIdFromJwt?: U;
}

export type ValidateOutput<T extends ValidatedRequest, U extends boolean> = U extends true ? (T & { jwtId: `user-${string}`; }) : T;
