export type ValidatedRequest = {
  pathParameters?: { [key: string]: unknown; };
  queryStringParameters?: { [key: string]: unknown; };
  body?: { [key: string]: unknown; };
  cookies?: string[];
  requestContext?: { [key: string]: unknown; };
};
