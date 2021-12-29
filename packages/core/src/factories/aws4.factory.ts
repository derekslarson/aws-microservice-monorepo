import aws4 from "aws4";

export type Aws4 = typeof aws4;

export type Aws4Factory = () => Aws4;

export const aws4Factory: Aws4Factory = () => aws4;
