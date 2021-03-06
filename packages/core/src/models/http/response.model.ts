import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { StatusCode } from "../../enums/statusCode.enum";

export type Response = APIGatewayProxyStructuredResultV2;

export interface ResponseWithParsedBody<T> {
  statusCode: number;
  headers: Record<string, boolean | number | string | string[]>
  body: T;
  isBase64Encoded?: boolean;
  cookies?: string[];
  redirect?: {
    path: string;
  };
}

export interface Body {
  [key: string]: any;
}

export interface SuccessResponse extends Response {
  statusCode: StatusCode.OK,
}

export interface CreatedResponse extends Response {
  statusCode: StatusCode.Created;
}

export interface AcceptedResponse extends Response {
  statusCode: StatusCode.Accepted;
}

export interface SeeOtherResponse extends Response {
  statusCode: StatusCode.SeeOther;
  headers: {
    Location: string;
  }
}

export interface BadRequestResponse extends Response {
  statusCode: StatusCode.BadRequest;
}

export interface ForbiddenResponse extends Response {
  statusCode: StatusCode.Forbidden;
}

export interface NotFoundResponse extends Response {
  statusCode: StatusCode.NotFound;
}

export interface InternalServerErrorResponse extends Response {
  statusCode: StatusCode.InternalServerError;
}
