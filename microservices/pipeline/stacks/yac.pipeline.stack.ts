/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
/* eslint-disable no-new */
import {
  Stack,
  StackProps,
  SecretValue,
  pipelines as Pipelines,
  aws_codepipeline_actions as CodePipelineActions,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { YacStage } from "../constructs/yac.stage";

export class YacPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const { environment, stackPrefix } = props;

    const branch = environment === Environment.Prod ? "master" : "develop";

    const pipeline = new Pipelines.CodePipeline(this, `Pipeline_${id}`, {
      selfMutation: false,
      synth: new Pipelines.ShellStep(`Synth_${id}`, {
        input: Pipelines.CodePipelineSource.gitHub("Yac-Team/yac-api-v4", branch, {
          authentication: SecretValue.secretsManager("yac-api-v4/github-oauth-token", { jsonField: "github-oauth-token" }),
          trigger: CodePipelineActions.GitHubTrigger.NONE,
        }),
        commands: [
          "yarn",
          "npx lerna bootstrap",
          `yarn workspace @yac/util build:${environment}`,
        ],
      }),
    });

    pipeline.addStage(new YacStage(this, `YacStage${environment}`, { environment, stackPrefix }));
  }
}

export interface PipelineStackProps extends StackProps {
  environment: string;
  stackPrefix: string;
}
