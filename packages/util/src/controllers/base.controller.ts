import "reflect-metadata";
import { injectable } from "inversify";
import { Details, ValidationError } from "runtypes";
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
  AcceptedResponse,
  SeeOtherResponse,
  FoundResponse,
  NoContentResponse,
} from "../models/http/response.model";
import { NotFoundError } from "../errors/notFound.error";
import { BadRequestError } from "../errors/badRequest.error";
import { ForbiddenError } from "../errors/forbidden.error";
import { StatusCode } from "../enums/statusCode.enum";
import { RequestValidationError } from "../errors/request.validation.error";
import { UnauthorizedError } from "../errors/unauthorized.error";

@injectable()
export abstract class BaseController {
  protected generateSuccessResponse(body: Body | string, headers: Record<string, string> = {}, cookies: string[] = []): SuccessResponse {
    return {
      statusCode: StatusCode.OK,
      headers,
      cookies,
      body: JSON.stringify(body),
    };
  }

  protected generateAcceptedResponse(body: Body | string, headers: Record<string, string> = {}, cookies: string[] = []): AcceptedResponse {
    return {
      statusCode: StatusCode.Accepted,
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

  protected generateNoContentResponse(headers: Record<string, string> = {}, cookies: string[] = []): NoContentResponse {
    return {
      statusCode: StatusCode.NoContent,
      headers,
      cookies,
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

    if (error instanceof ValidationError || (error as Error).name === "ValidationError") {
      return this.generateBadRequestResponse("Error validating request", (error as ValidationError).details);
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

  private generateBadRequestResponse(errorMessage: string, validationErrors?: Array<Record<string, unknown>> | Details): BadRequestResponse {
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
