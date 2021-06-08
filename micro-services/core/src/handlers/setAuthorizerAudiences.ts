import { SNSEvent } from "aws-lambda";
import { ApiGatewayV2, CognitoIdentityServiceProvider } from "aws-sdk";
import { ClientsUpdatedSnsMessage } from "../api-contracts/sns.topics";

export const handler = async (event: SNSEvent): Promise<void> => {
  try {
    const apiGatewayV2 = new ApiGatewayV2();
    const cognito = new CognitoIdentityServiceProvider();

    const message = JSON.parse(event.Records[0]?.Sns.Message) as ClientsUpdatedSnsMessage;

    const { UserPoolClients = [] } = await cognito.listUserPoolClients({ UserPoolId: process.env.USER_POOL_ID as string }).promise();

    const clientIds = UserPoolClients.map((userPoolClient) => userPoolClient.ClientId) as string[];

    let apiIds: string[] = [];

    // if passed an apiId in the event, use that
    if (message.apiId) {
      apiIds = [ message.apiId ];
    // otherwise, fetch all the apis in the env
    } else {
      const { Items = [] } = await apiGatewayV2.getApis().promise();

      apiIds = Items.filter((item) => item.Name.startsWith(`${process.env.STACK_PREFIX as string}-`) && !!item.ApiId).map((item) => item.ApiId) as string[];
    }

    const getAuthorizersResponses = await Promise.all(apiIds.map(async (id) => {
      const { Items = [] } = await apiGatewayV2.getAuthorizers({ ApiId: id }).promise();

      return Items.map((item) => ({ ...item, ApiId: id }));
    }));

    const authorizers = getAuthorizersResponses.reduce((acc, val) => [ ...acc, ...val ], []);

    await Promise.all((authorizers.map((authorizer) => apiGatewayV2.updateAuthorizer({
      ApiId: authorizer.ApiId,
      AuthorizerId: authorizer.AuthorizerId as string,
      JwtConfiguration: { Audience: clientIds },
    }).promise())));
  } catch (error: unknown) {
    console.log("Error:\n", error);
  }
};
