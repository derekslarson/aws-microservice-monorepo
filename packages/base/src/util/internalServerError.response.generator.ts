import { InternalServerErrorResponse } from "../models/http/response.model";
import { StatusCode } from "../enums/statusCode.enum";

// This only exists to be used in the catch block of handler files where the container may not be accessible.
// In general, we should not be using helper functions.

export const generateInternalServerErrorResponse = (
  error: unknown,
): InternalServerErrorResponse => ({
  statusCode: StatusCode.InternalServerError,
  body: JSON.stringify({
    message: "An unexpected error occurred.",
    data: error,
  }),
});
