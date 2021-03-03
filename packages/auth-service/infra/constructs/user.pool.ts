import * as CDK from "@aws-cdk/core";
import * as Cognito from "@aws-cdk/aws-cognito";
import * as CustomResources from "@aws-cdk/custom-resources";

interface UserPoolProps {
  resourceServerIdentifier: string;
  scopes: Cognito.ResourceServerScope[]
}

export class UserPool extends Cognito.UserPool {
  public userPoolClientId: string;

  public userPoolClientSecret: string;

  public userPoolDomainName: string;

  constructor(scope: CDK.Stack, id: string, props: UserPoolProps) {
    super(scope, id, {
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      signInAliases: { email: true },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
      customAttributes: { authChallenge: new Cognito.StringAttribute({ mutable: true }) },
    });

    const userPoolDomain = new Cognito.UserPoolDomain(this, "UserPoolDomain", {
      userPool: this,
      cognitoDomain: { domainPrefix: "yac-auth-service" },
    });

    this.userPoolDomainName = userPoolDomain.domainName;

    const userPoolResourceServer = new Cognito.UserPoolResourceServer(this, "MessageResourceServer", {
      identifier: props.resourceServerIdentifier,
      userPool: this,
      scopes: props.scopes,
    });

    const clientScopes = props.scopes.map((scopeItem) => ({ scopeName: `${props.resourceServerIdentifier}/${scopeItem.scopeName}` }));

    const userPoolClient = new Cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: this,
      generateSecret: true,
      authFlows: { custom: true },
      oAuth: {
        flows: { clientCredentials: true },
        scopes: clientScopes,
      },
    });

    this.userPoolClientId = userPoolClient.userPoolClientId;

    userPoolClient.node.addDependency(userPoolResourceServer);

    const describeCognitoUserPoolClient = new CustomResources.AwsCustomResource(this, "DescribeCognitoUserPoolClient", {
      resourceType: "Custom::DescribeCognitoUserPoolClient",
      onCreate: {
        region: scope.region,
        service: "CognitoIdentityServiceProvider",
        action: "describeUserPoolClient",
        parameters: {
          UserPoolId: this.userPoolId,
          ClientId: userPoolClient.userPoolClientId,
        },
        physicalResourceId: CustomResources.PhysicalResourceId.of(userPoolClient.userPoolClientId),
      },
      policy: CustomResources.AwsCustomResourcePolicy.fromSdkCalls({ resources: CustomResources.AwsCustomResourcePolicy.ANY_RESOURCE }),
    });

    this.userPoolClientSecret = describeCognitoUserPoolClient.getResponseField("UserPoolClient.ClientSecret");
  }
}
