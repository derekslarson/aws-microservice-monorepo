import { SNS } from "aws-sdk";

export type SnsFactory = () => SNS;

export const snsFactory: SnsFactory = (): SNS => new SNS();
