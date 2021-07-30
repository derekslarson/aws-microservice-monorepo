import S3 from "aws-sdk/clients/s3";

export type S3Factory = () => S3;

export const s3Factory: S3Factory = () => new S3();
