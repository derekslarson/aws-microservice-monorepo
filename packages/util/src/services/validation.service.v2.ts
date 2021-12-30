import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Failcode, ValidationError } from "runtypes";
import { Runtype } from "runtypes/lib/runtype";
import { TYPES } from "../inversion-of-control/types";
import { LoggerServiceInterface } from "./logger.service";
import { Request } from "../models/http/request.model";
import { ForbiddenError } from "../errors/forbidden.error";
import { ValidatedRequest } from "../types/validatedRequest.type";

@injectable()
export class ValidationServiceV2 implements ValidationServiceV2Interface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) {}

  public validate<T extends ValidatedRequest, U extends boolean>(params: ValidateInput<T, U>): ValidateOutput<T, U> {
    try {
      this.loggerService.trace("validate called", { params }, this.constructor.name);

      const { dto, request, getUserIdFromJwt, scopes = [] } = params;

      // This is necessary due to the difference in requestContext.authorizer
      // structure in the responses from http and websocket authorizers
      const jwtId = request.requestContext.authorizer?.lambda?.userId || request.requestContext.authorizer?.userId;
      const jwtScope = request.requestContext.authorizer?.lambda?.scope || request.requestContext.authorizer?.scope;

      if (getUserIdFromJwt && (!jwtId || !jwtScope)) {
        throw new ForbiddenError("Forbidden");
      }

      if (scopes.length) {
        const tokenScopes = (jwtScope || "").split(" ");
        const tokenScopesSet = new Set(tokenScopes);

        let authorized = false;

        for (const scope of scopes) {
          if (tokenScopesSet.has(scope)) {
            authorized = true;
            break;
          }
        }

        if (!authorized) {
          throw new ForbiddenError("Forbidden");
        }
      }

      let body: Record<string, unknown> | undefined;
      if (request.body) {
        try {
          if (request.headers["content-type"] === "application/x-www-form-urlencoded") {
            const urlEncodedBody: string = request.isBase64Encoded ? Buffer.from(request.body, "base64").toString() : request.body;
            const parsedBody: Record<string, unknown> = {};

            urlEncodedBody.split("&").forEach((keyValuePair) => {
              const [ key, value ] = keyValuePair.split("=");
              parsedBody[key] = decodeURIComponent(value);
            });

            body = parsedBody;
          } else {
            body = JSON.parse(request.body) as Record<string, unknown>;
          }
        } catch (error: unknown) {
          throw new ValidationError({
            success: false,
            code: Failcode.VALUE_INCORRECT,
            message: "Error parsing body.",
            details: { body: "Malformed" },
          });
        }
      }

      const parsedRequest = {
        pathParameters: {},
        queryStringParameters: {},
        ...request,
        body,
      };

      const validatedRequest = dto.check(parsedRequest);

      if (jwtId && jwtScope) {
        return { ...validatedRequest, jwtId, jwtScope };
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
  scopes?: string[];
}

export type ValidateOutput<T extends ValidatedRequest, U extends boolean> = U extends true ? (T & { jwtId: `user_${string}`; jwtScope: string; }) : T;
