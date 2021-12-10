export type ValidatedRequest = {
  headers?: { [key: string]: unknown; }
  pathParameters?: { [key: string]: unknown; };
  queryStringParameters?: { [key: string]: unknown; };
  body?: { [key: string]: unknown; };
  cookies?: string[];
  requestContext?: { [key: string]: unknown; };
};
