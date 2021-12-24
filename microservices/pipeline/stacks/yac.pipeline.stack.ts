/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
/* eslint-disable no-new */
import { Environment } from "@yac/util/src/enums/environment.enum";
import {
  Stack,
  StackProps,
  SecretValue,
  pipelines as Pipelines,
  aws_codepipeline_actions as CodePipelineActions,
  aws_codebuild as CodeBuild,
} from "aws-cdk-lib";
import { Construct } from "constructs";
// import { Environment } from "@yac/util/src/enums/environment.enum";
import { YacStage } from "../constructs/yac.stage";

export class YacPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const { environment, stackPrefix } = props;

    const pipeline = new Pipelines.CodePipeline(this, "Pipeline", {
      pipelineName: `${stackPrefix}-YacPipeline`,
      codeBuildDefaults: {
        buildEnvironment: {
          buildImage: CodeBuild.LinuxBuildImage.STANDARD_5_0,
          computeType: CodeBuild.ComputeType.LARGE,
        },
      },
      synth: new Pipelines.ShellStep(`Synth_${id}`, {
        input: Pipelines.CodePipelineSource.gitHub("Yac-Team/yac-api-v4", "feature/new-pipeline", {
          authentication: SecretValue.secretsManager("yac-api-v4/github-oauth-token", { jsonField: "github-oauth-token" }),
          trigger: CodePipelineActions.GitHubTrigger.NONE,
        }),
        commands: [
          "yarn",
          "npx lerna bootstrap",
          `npx lerna run build:${environment}:v2`,
          `yarn workspace @yac/pipeline synth:${environment}`,
        ],
        primaryOutputDirectory: "microservices/pipeline/cdk.out",
      }),
    });

    pipeline.addStage(new YacStage(this, stackPrefix, { environment, stackPrefix }));
  }
}

export interface PipelineStackProps extends StackProps {
  environment: Environment;
  stackPrefix: string;
}
