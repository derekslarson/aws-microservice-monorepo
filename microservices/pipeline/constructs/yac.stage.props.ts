import { Environment } from "@yac/util/src/enums/environment.enum";
import { StageProps } from "aws-cdk-lib";

export interface YacStageProps extends StageProps {
  environment: Environment;
  stackPrefix: string;
}
