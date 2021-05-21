import "source-map-support/register";
import * as CDK from "@aws-cdk/core";
import { AuthServiceConfirmPath, AuthServiceLoginPath, AuthServiceSignUpPath, Environment } from "@yac/core";
import * as S3Deployment from "@aws-cdk/aws-s3-deployment";
import { buildAssets, EAssetsType } from "@yac-assets/build";
import { YacAuthServiceStack } from "./stacks/yac.auth.service.stack";

const app = new CDK.App();

const environment = app.node.tryGetContext("environment") as string;
const developer = app.node.tryGetContext("developer") as string;

if (!environment) {
  throw new Error("'environment' context param required.");
} else if (environment === Environment.Local && !developer) {
  throw new Error("'developer' context param required when 'environment' === 'local'.");
}

// token comment

const stackPrefix = environment === Environment.Local ? developer : environment;

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  // eslint-disable-next-line no-new
  const stack = new YacAuthServiceStack(app, `${stackPrefix}-YacAuthService`, { serviceName: "auth-service" });
  const idYacComAssetPath = await buildAssets("auth-service", {
    env: {
      base_url: stack.httpApi.apiURL,
      sign_in_path: "/login" as AuthServiceLoginPath,
      sign_up_path: "/sign-up" as AuthServiceSignUpPath,
      authenticate_path: "/confirm" as AuthServiceConfirmPath,
    },
    type: EAssetsType.REACT,
  });

  // eslint-disable-next-line no-new
  new S3Deployment.BucketDeployment(stack, `${stackPrefix}-idYacComDeployment`, {
    sources: [ S3Deployment.Source.asset(idYacComAssetPath.distPath) ],
    destinationBucket: stack.websiteBucket,
  });
})();
