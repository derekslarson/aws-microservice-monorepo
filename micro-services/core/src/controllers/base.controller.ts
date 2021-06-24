import "reflect-metadata";
import { injectable } from "inversify";
import {
  Body,
  SuccessResponse,
  NotFoundResponse,
  UnauthorizedResponse,
  InternalServerErrorResponse,
  BadRequestResponse,
  ForbiddenResponse,
  Response,
  CreatedResponse,
  SeeOtherResponse,
  FoundResponse,
} from "../models/http/response.model";
import { NotFoundError } from "../errors/notFound.error";
import { BadRequestError } from "../errors/badRequest.error";
import { ForbiddenError } from "../errors/forbidden.error";
import { StatusCode } from "../enums/statusCode.enum";
import { RequestValidationError } from "../errors/request.validation.error";
import { UnauthorizedError } from "../errors/unauthorized.error";
import { Request } from "../models/http/request.model";

@injectable()
export abstract class BaseController {
  protected getUserIdFromRequestWithJwt(request: Request): string {
    const rawUserId = request.requestContext.authorizer?.jwt.claims.sub;

    if (!rawUserId) {
      throw new ForbiddenError("Forbidden");
    }

    return `USER-${rawUserId as string}`;
  }

  protected generateSuccessResponse(body: Body | string, headers: Record<string, string> = {}, cookies: string[] = []): SuccessResponse {
    return {
      statusCode: StatusCode.OK,
      headers,
      cookies,
      body: JSON.stringify(body),
    };
  }

  protected generateCreatedResponse(body: Body, headers: Record<string, string> = {}, cookies: string[] = []): CreatedResponse {
    return {
      statusCode: StatusCode.Created,
      headers,
      cookies,
      body: JSON.stringify(body),
    };
  }

  protected generateFoundResponse(redirectLocation: string, otherHeaders: Record<string, string> = {}, cookies: string[] = []): FoundResponse {
    return {
      statusCode: StatusCode.Found,
      headers: { Location: redirectLocation, ...otherHeaders },
      cookies,
    };
  }

  protected generateSeeOtherResponse(redirectLocation: string, otherHeaders: Record<string, string> = {}, cookies: string[] = []): SeeOtherResponse {
    return {
      statusCode: StatusCode.SeeOther,
      headers: { Location: redirectLocation, ...otherHeaders },
      cookies,
    };
  }

  protected generateErrorResponse(error: unknown): Response {
    if (error instanceof NotFoundError) {
      return this.generateNotFoundResponse(error.message);
    }

    if (error instanceof ForbiddenError) {
      return this.generateForbiddenResponse(error.message);
    }

    if (error instanceof RequestValidationError) {
      return this.generateBadRequestResponse(error.message, error.validationErrors);
    }

    if (error instanceof BadRequestError) {
      return this.generateBadRequestResponse(error.message);
    }

    if (error instanceof UnauthorizedError) {
      return this.generateUnauthorizedResponse(error.message);
    }

    return this.generateInternalServerErrorResponse();
  }

  private generateNotFoundResponse(errorMessage: string): NotFoundResponse {
    const body = { message: errorMessage };

    return {
      statusCode: StatusCode.NotFound,
      body: JSON.stringify(body),
    };
  }

  private generateUnauthorizedResponse(errorMessage: string): UnauthorizedResponse {
    const body = { message: errorMessage };

    return {
      statusCode: StatusCode.Unauthorized,
      body: JSON.stringify(body),
    };
  }

  private generateBadRequestResponse(errorMessage: string, validationErrors?: Array<{ property: string, value: unknown; issues: string[]; }>): BadRequestResponse {
    const body = {
      message: errorMessage,
      ...(validationErrors && { validationErrors }),
    };

    return {
      statusCode: StatusCode.BadRequest,
      body: JSON.stringify(body),
    };
  }

  private generateForbiddenResponse(errorMessage: string): ForbiddenResponse {
    const body = { message: errorMessage };

    return {
      statusCode: StatusCode.Forbidden,
      body: JSON.stringify(body),
    };
  }

  private generateInternalServerErrorResponse(): InternalServerErrorResponse {
    const body = { message: "An unexpected error occurred." };

    return {
      statusCode: StatusCode.InternalServerError,
      body: JSON.stringify(body),
    };
  }
}
