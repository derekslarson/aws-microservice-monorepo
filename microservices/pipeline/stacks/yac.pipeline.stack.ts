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
import { YacStage } from "../constructs/yac.stage";

export class YacPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const { environment, branch } = props;

    const isProd = environment === Environment.Prod;

    const pipeline = new Pipelines.CodePipeline(this, "Pipeline", {
      codePipeline: new CodePipeline.Pipeline(this, "BasePipeline", {
        pipelineName: `${environment}-Pipeline`,
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
        input: Pipelines.CodePipelineSource.gitHub("Yac-Team/yac-api-v4", branch, {
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

    pipeline.addStage(new YacStage(this, isProd ? Environment.Stage : environment, { environment: isProd ? Environment.Stage : environment }));

    if (isProd) {
      pipeline.addStage(new YacStage(this, Environment.Prod, { environment: Environment.Prod }));
    }
  }
}

interface PipelineStackProps extends StackProps {
  environment: string;
  branch: string;
}
