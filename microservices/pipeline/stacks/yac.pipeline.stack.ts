/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
/* eslint-disable no-new */
import { Environment } from "@yac/util/src/enums/environment.enum";
import {
  Stack,
  StackProps,
  SecretValue,
  pipelines as Pipelines,
  aws_codepipeline as CodePipeline,
  aws_codepipeline_actions as CodePipelineActions,
  aws_codebuild as CodeBuild,
  aws_iam as IAM,
} from "aws-cdk-lib";
import { Construct } from "constructs";
// import { Environment } from "@yac/util/src/enums/environment.enum";
import { YacStage } from "../constructs/yac.stage";

export class YacPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const { environment, stackPrefix } = props;

    const pipeline = new Pipelines.CodePipeline(this, "Pipeline", {
      codePipeline: new CodePipeline.Pipeline(this, "BasePipeline", {
        pipelineName: `${stackPrefix}-Pipeline`,
        role: new IAM.Role(this, "BasePipelineRole", {
          assumedBy: new IAM.ServicePrincipal("codepipeline.amazonaws.com"),
          managedPolicies: [ IAM.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess") ],
        }).withoutPolicyUpdates(),
      }),
      codeBuildDefaults: {
        buildEnvironment: {
          buildImage: CodeBuild.LinuxBuildImage.STANDARD_5_0,
          computeType: CodeBuild.ComputeType.LARGE,
        },
      },
      synth: new Pipelines.ShellStep(`Synth_${id}`, {
        input: Pipelines.CodePipelineSource.gitHub("Yac-Team/yac-api-v4", "feature/new-pipeline", {
          authentication: SecretValue.secretsManager("yac-api-v4/github-oauth-token", { jsonField: "github-oauth-token" }),
          trigger: CodePipelineActions.GitHubTrigger.WEBHOOK,
        }),
        commands: [
          "yarn",
          "npx lerna bootstrap",
          `npx lerna run build:${environment}`,
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
