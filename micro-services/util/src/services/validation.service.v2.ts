import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Failcode, ValidationError } from "runtypes";
import { Runtype } from "runtypes/lib/runtype";
import { TYPES } from "../inversion-of-control/types";
import { LoggerServiceInterface } from "./logger.service";
import { Request } from "../models/http/request.model";
import { ForbiddenError } from "../errors";
import { ValidatedRequest } from "../types/validatedRequest.type";
import { UserId } from "../types/userId.type";

@injectable()
export class ValidationServiceV2 implements ValidationServiceV2Interface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) {}

  public validate<T extends ValidatedRequest, U extends boolean>(params: ValidateInput<T, U>): ValidateOutput<T, U> {
    try {
      this.loggerService.trace("validate called", { params }, this.constructor.name);

      const { dto, request, getUserIdFromJwt, scopes = [] } = params;

      if (scopes.length) {
        const tokenScopes = (request.requestContext.authorizer?.lambda?.scope || request.requestContext.authorizer?.scope || "").split(" ");
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

      let jwtId: `user-${string}` | undefined;

      if (getUserIdFromJwt) {
        const userId = request.requestContext.authorizer?.lambda?.userId || request.requestContext.authorizer?.userId;

        if (!userId) {
          throw new ForbiddenError("Forbidden");
        }

        jwtId = userId;
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

type RequestWithAuthorizerContext = Request & {
  requestContext: {
    authorizer?: {
      userId?: UserId;
      scope?: string;
      lambda?: {
        userId?: UserId;
        scope?: string;
      }
    }
  }
};

export interface ValidateInput<T extends ValidatedRequest, U extends boolean> {
  dto: Runtype<T>;
  request: RequestWithAuthorizerContext;
  getUserIdFromJwt?: U;
  scopes?: string[];
}

export type ValidateOutput<T extends ValidatedRequest, U extends boolean> = U extends true ? (T & { jwtId: `user-${string}`; }) : T;
