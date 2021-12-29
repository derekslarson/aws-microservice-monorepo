import { SES } from "aws-sdk";

export type SesFactory = () => SES;

export const sesFactory: SesFactory = () => new SES();
