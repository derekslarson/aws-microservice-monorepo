import { documentClient } from "../../../e2e/util";
import { ListenerType } from "../src/enums/listenerType.enum";
import { RawListenerMapping } from "../src/repositories/listenerMapping.dynamo.repository";

export async function getListenerMappingsByUserIdAndType(params: GetListenerMappingsByUserIdAndTypeInput): Promise<GetListenerMappingsByUserIdAndTypeOutput> {
  try {
    const { userId, type } = params;

    const { Items } = await documentClient.query({
      TableName: process.env["listener-mapping-table-name"] as string,
      KeyConditionExpression: "#pk = :userId AND begins_with(#sk, :type)",
      ExpressionAttributeNames: {
        "#pk": "pk",
        "#sk": "sk",
      },
      ExpressionAttributeValues: {
        ":userId": userId,
        ":type": `${type}-`,
      },
    }).promise();

    return { listenerMappings: Items as RawListenerMapping[] };
  } catch (error) {
    console.log("Error in getTeamUserRelationship:\n", error);

    throw error;
  }
}

interface GetListenerMappingsByUserIdAndTypeInput {
  userId: string;
  type: ListenerType;
}

interface GetListenerMappingsByUserIdAndTypeOutput {
  listenerMappings: RawListenerMapping[];
}
