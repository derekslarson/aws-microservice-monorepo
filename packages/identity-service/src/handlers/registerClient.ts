import "reflect-metadata";
import { CloudFormationCustomResourceEvent, Context } from "aws-lambda";
import { SSM } from "aws-sdk";
import axios from "axios";

async function sendResponse(event: CloudFormationCustomResourceEvent, context: Context, responseStatus: "SUCCESS" | "FAILED", responseData: Record<string, unknown> = {}, physicalResourceId = ""): Promise<void> {
  const reason = responseStatus === "FAILED" ? (`See the details in CloudWatch Log Stream: ${context.logStreamName}`) : undefined;

  const responseBody = JSON.stringify({
    StackId: event.StackId,
    RequestId: event.RequestId,
    Status: responseStatus,
    Reason: reason,
    PhysicalResourceId: physicalResourceId || context.logStreamName,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData || {},
  });

  const responseOptions = {
    headers: {
      "Content-Type": "",
      "Content-Length": responseBody.length,
    },
  };

  console.info("Response body:\n", responseBody);

  try {
    await axios.put(event.ResponseURL, responseBody, responseOptions);

    console.info("CloudFormationSendResponse Success");
  } catch (error: unknown) {
    console.error("CloudFormationSendResponse Error:\n", error);

    throw new Error("Could not send CloudFormation response");
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export const handler = async (event: CloudFormationCustomResourceEvent, context: Context): Promise<void> => {
  try {
    console.log("Event:\n", event);

    const ssm = new SSM();
    const data: Record<string, any> = {};
    const clientIdSsmName = `/yac/${process.env.STACK_NAME || ""}/client-id`;
    const clientSecretSsmName = `/yac/${process.env.STACK_NAME || ""}/client-secret`;

    if (event.RequestType === "Create") {
      const { data: response } = await axios.post<{ clientId: string, clientSecret: string; }>("https://wg9xi3kjeh.execute-api.us-east-2.amazonaws.com/clients", {
        name: "Yac Client",
        redirectUri: "https://example.com",
        scopes: [ "yac/message.read", "yac/message.write", "yac/message.delete" ],
      });

      await Promise.all([
        ssm.putParameter({ Name: clientIdSsmName, Value: response.clientId, Type: "String" }).promise(),
        ssm.putParameter({ Name: clientSecretSsmName, Value: response.clientSecret, Type: "String" }).promise(),
      ]);

      data.clientId = response.clientId;
      data.clientSecret = response.clientSecret;
    } else if (event.RequestType === "Update") {
      const [ clientIdParameter, clientSecretParameter ] = await Promise.all([
        ssm.getParameter({ Name: clientIdSsmName }).promise(),
        ssm.getParameter({ Name: clientSecretSsmName }).promise(),
      ]);

      data.clientId = clientIdParameter.Parameter?.Value;
      data.clientSecret = clientSecretParameter.Parameter?.Value;
    } else if (event.RequestType === "Delete") {
      const [ clientIdParameter, clientSecretParameter ] = await Promise.all([
        ssm.getParameter({ Name: clientIdSsmName }).promise(),
        ssm.getParameter({ Name: clientSecretSsmName }).promise(),
      ]);

      const clientId = clientIdParameter.Parameter?.Value || "";
      const clientSecret = clientSecretParameter.Parameter?.Value || "";

      await axios.delete(`https://wg9xi3kjeh.execute-api.us-east-2.amazonaws.com/clients/${clientId}`, { headers: { secret: clientSecret } });

      await Promise.all([
        ssm.deleteParameter({ Name: clientIdSsmName }).promise(),
        ssm.deleteParameter({ Name: clientSecretSsmName }).promise(),
      ]);
    }

    await sendResponse(event, context, "SUCCESS", data);
  } catch (error) {
    console.log("Error:\n", error);

    await sendResponse(event, context, "FAILED");
  }
};
