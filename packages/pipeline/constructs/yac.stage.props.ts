import { StageProps } from "aws-cdk-lib";

export interface YacStageProps extends StageProps {
  environment: string;
}
