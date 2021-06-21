import "reflect-metadata";
import DynamoDB from "aws-sdk/clients/dynamodb";
import { injectable, unmanaged } from "inversify";
import { LoggerServiceInterface } from "../services/logger.service";
import { DocumentClientFactory } from "../factories/documentClient.factory";
import { IdServiceInterface } from "../services/id.service";
import { RecursivePartial } from "../types/recursivePartial.type";
import { RawEntity } from "../types/raw.entity.type";
import { CleansedEntity } from "../types/cleansed.entity.type";

@injectable()
export abstract class BaseDynamoRepositoryV2<T> {
  protected documentClient: DynamoDB.DocumentClient;

  constructor(
  @unmanaged() documentClientFactory: DocumentClientFactory,
    @unmanaged() protected tableName: string,
    @unmanaged() protected idService: IdServiceInterface,
    @unmanaged() protected loggerService: LoggerServiceInterface,
  ) {
    this.tableName = tableName;
    this.documentClient = documentClientFactory();
  }

  protected async partialUpdate(pk: string, sk: string, update: RecursivePartial<T>): Promise<CleansedEntity<T>> {
    try {
      this.loggerService.trace("partialUpdate called", { update }, this.constructor.name);

      const updateItemInput = this.generatePartialUpdateItemInput(pk, sk, update);

      const { Attributes } = await this.documentClient.update(updateItemInput).promise();

      return this.cleanse(Attributes as RawEntity<T>);
    } catch (error: unknown) {
      this.loggerService.error("Error in partialUpdate", { error, update }, this.constructor.name);

      throw error;
    }
  }

  protected async batchGet(keyList: DynamoDB.DocumentClient.KeyList, prevFetchedItems: RawEntity<T>[] = [], backoff = 200, maxBackoff = 1600): Promise<CleansedEntity<T>[]> {
    try {
      this.loggerService.trace("batchGet called", { keyList, prevFetchedItems, backoff, maxBackoff }, this.constructor.name);

      const chunkedKeyList = this.chunkArrayInGroups(keyList, 100);

      const batchGetResponses = await Promise.all(chunkedKeyList.map((chunk) => this.documentClient.batchGet({ RequestItems: { [this.tableName]: { Keys: chunk } } }).promise()));

      const { fetchedItems, unprocessedKeys } = batchGetResponses.reduce((acc: { fetchedItems: RawEntity<T>[]; unprocessedKeys: DynamoDB.DocumentClient.KeyList; }, batchGetResponse) => {
        const items = batchGetResponse.Responses?.[this.tableName];
        const unprocessed = batchGetResponse.UnprocessedKeys?.[this.tableName]?.Keys;

        if (items) {
          acc.fetchedItems.push(...items as RawEntity<T>[]);
        }

        if (unprocessed) {
          acc.unprocessedKeys.push(...unprocessed);
        }

        return acc;
      }, { fetchedItems: [], unprocessedKeys: [] });

      const combinedFetchedItems = [ ...prevFetchedItems, ...fetchedItems ];

      if (unprocessedKeys.length) {
        if (backoff > maxBackoff) {
          throw new Error(`Max backoff reached. Remaining unprocessed keys:\n${JSON.stringify(unprocessedKeys, null, 2)}`);
        }

        return new Promise((resolve) => {
          setTimeout(() => resolve(this.batchGet(unprocessedKeys, combinedFetchedItems, backoff * 2)), backoff);
        });
      }

      return combinedFetchedItems.map((item) => this.cleanse(item));
    } catch (error: unknown) {
      this.loggerService.error("Error in chunkedBatchGet", { error, keyList, prevFetchedItems, backoff, maxBackoff }, this.constructor.name);

      throw error;
    }
  }

  // https://github.com/typescript-eslint/typescript-eslint/issues/1277
  // eslint-disable-next-line consistent-return
  protected async batchWrite(writeRequests: DynamoDB.DocumentClient.WriteRequests, backoff = 200, maxBackoff = 1600): Promise<void> {
    try {
      this.loggerService.trace("batchWrite called", { writeRequests, backoff, maxBackoff }, this.constructor.name);

      const chunkedWriteRequests = this.chunkArrayInGroups(writeRequests, 25);

      const batchWriteResponses = await Promise.all(chunkedWriteRequests.map((chunk) => this.documentClient.batchWrite({ RequestItems: { [this.tableName]: chunk } }).promise()));

      const { unprocessedWriteRequests } = batchWriteResponses.reduce((acc: { unprocessedWriteRequests: DynamoDB.DocumentClient.WriteRequests; }, batchWriteResponse) => {
        const unprocessedRequests = batchWriteResponse.UnprocessedItems?.[this.tableName];

        if (unprocessedRequests) {
          acc.unprocessedWriteRequests.push(...unprocessedRequests);
        }

        return acc;
      }, { unprocessedWriteRequests: [] });

      if (unprocessedWriteRequests.length) {
        if (backoff > maxBackoff) {
          throw new Error(`Max backoff reached. Remaining unprocessed write requests:\n${JSON.stringify(unprocessedWriteRequests, null, 2)}`);
        }

        return new Promise((resolve) => {
          setTimeout(() => resolve(this.batchWrite(unprocessedWriteRequests, backoff * 2)), backoff);
        });
      }
    } catch (error: unknown) {
      this.loggerService.error("Error in batchWrite", { error, writeRequests, backoff, maxBackoff }, this.constructor.name);

      throw error;
    }
  }

  private cleanse(item: RawEntity<T>): CleansedEntity<T> {
    const { type, pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...rest } = item;

    return rest;
  }

  private chunkArrayInGroups<T>(arr: T[], size: number): T[][] {
    const arrayOfArrays: T[][] = [];

    for (let i = 0; i < arr.length; i += size) {
      arrayOfArrays.push(arr.slice(i, i + size));
    }

    return arrayOfArrays;
  }

  private generatePartialUpdateItemInput(
    pk: string,
    sk: string,
    rootLevelOrNestedObject: Record<string, unknown>,
    previousUpdateItemInput?: DynamoDB.DocumentClient.UpdateItemInput,
    previousExpressionAttributePath?: string,
  ): DynamoDB.DocumentClient.UpdateItemInput {
    try {
      this.loggerService.trace("generatePartialUpdateItemInput called", { pk, sk, rootLevelOrNestedObject, previousUpdateItemInput, previousExpressionAttributePath }, this.constructor.name);

      const baseUpdateItemInput: DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: this.tableName,
        Key: { pk, sk },
        UpdateExpression: "SET",
        ExpressionAttributeNames: {},
        ExpressionAttributeValues: {},
        ReturnValues: "ALL_NEW",
      };

      /* eslint-disable no-param-reassign */
      const generatedUpdateItemInput = Object.entries(rootLevelOrNestedObject).reduce((updateItemInput, [ key, value ]) => {
        const expressionAttributeName = `#${key}`;
        const expressionAttributePath = `${previousExpressionAttributePath ? `${previousExpressionAttributePath}.` : ""}${expressionAttributeName}`;
        const expressionAttributeValue = `:${key}`;

        updateItemInput.ExpressionAttributeNames = {
          ...updateItemInput.ExpressionAttributeNames,
          [expressionAttributeName]: key,
        };

        if (typeof value === "object" && !Array.isArray(value) && value !== null) {
          return this.generatePartialUpdateItemInput(pk, sk, value as Record<string, unknown>, updateItemInput, expressionAttributePath);
        }

        updateItemInput.ExpressionAttributeValues = {
          ...updateItemInput.ExpressionAttributeValues,
          [expressionAttributeValue]: value,
        };
        updateItemInput.UpdateExpression += ` ${expressionAttributePath} = ${expressionAttributeValue},`;

        return updateItemInput;
      }, previousUpdateItemInput || baseUpdateItemInput);
      /* eslint-enable no-param-reassign */

      if ((generatedUpdateItemInput.UpdateExpression as string)[(generatedUpdateItemInput.UpdateExpression as string).length - 1] === ",") {
        generatedUpdateItemInput.UpdateExpression = generatedUpdateItemInput.UpdateExpression?.slice(0, -1);
      }

      return generatedUpdateItemInput;
    } catch (error: unknown) {
      this.loggerService.error("Error in generatePartialUpdateItemInput", { error, pk, sk, rootLevelOrNestedObject, previousUpdateItemInput, previousExpressionAttributePath }, this.constructor.name);

      throw error;
    }
  }
}
