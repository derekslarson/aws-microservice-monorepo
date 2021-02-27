import "reflect-metadata";
import { injectable } from "inversify";
import { Body,
  SuccessResponse,
  NotFoundResponse,
  InternalServerErrorResponse,
  BadRequestResponse,
  ForbiddenResponse,
  Response,
  CreatedResponse,
  SeeOtherResponse } from "../models/http/response.model";
import { NotFoundError } from "../errors/notFound.error";
import { BadRequestError } from "../errors/badRequest.error";
import { ForbiddenError } from "../errors/forbidden.error";
import { StatusCode } from "../enums/statusCode.enum";

@injectable()
export abstract class BaseController {
  protected generateSuccessResponse(body: Body | string): SuccessResponse {
    return {
      statusCode: StatusCode.OK,
      body: JSON.stringify(body),
    };
  }

  protected generateCreatedResponse(body: Body): CreatedResponse {
    return {
      statusCode: StatusCode.Created,
      body: JSON.stringify(body),
    };
  }

  protected generateSeeOtherResponse(redirectLocation: string): SeeOtherResponse {
    return {
      statusCode: StatusCode.SeeOther,
      headers: { Location: redirectLocation },
    };
  }

  protected generateErrorResponse(error: unknown): Response {
    if (error instanceof NotFoundError) {
      return this.generateNotFoundResponse(error.message);
    }

    if (error instanceof ForbiddenError) {
      return this.generateForbiddenResponse(error.message);
    }

    if (error instanceof BadRequestError) {
      return this.generateBadRequestResponse(error.message);
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

  private generateBadRequestResponse(
    errorMessage: string,
    otherErrorData?: Body,
  ): BadRequestResponse {
    const body = {
      message: errorMessage,
      ...(otherErrorData || {}),
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
