import "reflect-metadata";
import DynamoDB from "aws-sdk/clients/dynamodb";
import { injectable, unmanaged } from "inversify";
import { LoggerServiceInterface } from "../services/logger.service";
import { DocumentClientFactory } from "../factories/documentClient.factory";
import { RecursivePartial } from "../types/recursivePartial.type";
import { RawEntity } from "../types/raw.entity.type";
import { CleansedEntity } from "../types/cleansed.entity.type";
import { NotFoundError } from "../errors/notFound.error";
import { BadRequestError } from "../errors";

@injectable()
export abstract class BaseDynamoRepositoryV2<T> {
  protected documentClient: DynamoDB.DocumentClient;

  constructor(
  @unmanaged() documentClientFactory: DocumentClientFactory,
    @unmanaged() protected tableName: string,
    @unmanaged() protected loggerService: LoggerServiceInterface,
  ) {
    this.tableName = tableName;
    this.documentClient = documentClientFactory();
  }

  protected async partialUpdate(pk: string, sk: string, update: RecursivePartial<CleansedEntity<T>>): Promise<CleansedEntity<T>> {
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

  protected async get(params: Omit<DynamoDB.DocumentClient.GetItemInput, "TableName">, entityType = "Entity"): Promise<CleansedEntity<T>> {
    try {
      this.loggerService.trace("get called", { params }, this.constructor.name);

      const { Item } = await this.documentClient.get({
        TableName: this.tableName,
        ...params,
      }).promise();

      if (!Item) {
        throw new NotFoundError(`${entityType} not found.`);
      }

      return this.cleanse(Item as RawEntity<T>);
    } catch (error: unknown) {
      this.loggerService.error("Error in get", { error, params }, this.constructor.name);

      throw error;
    }
  }

  protected async query(params: Omit<DynamoDB.DocumentClient.QueryInput, "TableName">): Promise<{ Items: CleansedEntity<T>[]; LastEvaluatedKey?: DynamoDB.DocumentClient.Key; }> {
    try {
      this.loggerService.trace("query called", { params }, this.constructor.name);

      const response = await this.documentClient.query({
        TableName: this.tableName,
        ...params,
      }).promise();

      const cleansedItems = (response.Items || []).map((item) => this.cleanse(item as RawEntity<T>));

      return { Items: cleansedItems, LastEvaluatedKey: response.LastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in query", { error, params }, this.constructor.name);

      throw error;
    }
  }

  protected async batchGet(keysAndAttributes: DynamoDB.DocumentClient.KeysAndAttributes, prevFetchedItems: RawEntity<T>[] = [], backoff = 200, maxBackoff = 800): Promise<CleansedEntity<T>[]> {
    try {
      this.loggerService.trace("batchGet called", { keysAndAttributes, prevFetchedItems, backoff, maxBackoff }, this.constructor.name);

      const chunkedKeyList = this.chunkArrayInGroups(keysAndAttributes.Keys, 100);

      const batchGetResponses = await Promise.all(chunkedKeyList.map((chunk) => this.documentClient.batchGet({ RequestItems: { [this.tableName]: { ...keysAndAttributes, Keys: chunk } } }).promise()));

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
          setTimeout(() => resolve(this.batchGet({ ...keysAndAttributes, Keys: unprocessedKeys }, combinedFetchedItems, backoff * 2)), backoff);
        });
      }

      return combinedFetchedItems.map((item) => this.cleanse(item));
    } catch (error: unknown) {
      this.loggerService.error("Error in batchGet", { error, keysAndAttributes, prevFetchedItems, backoff, maxBackoff }, this.constructor.name);

      throw error;
    }
  }

  // https://github.com/typescript-eslint/typescript-eslint/issues/1277
  // eslint-disable-next-line consistent-return
  protected async batchWrite(writeRequests: DynamoDB.DocumentClient.WriteRequests, backoff = 200, maxBackoff = 800): Promise<void> {
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

  protected cleanse(item: RawEntity<T>): CleansedEntity<T> {
    try {
      this.loggerService.trace("cleanse called", { item }, this.constructor.name);

      const { type, pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...rest } = item;

      return rest as unknown as CleansedEntity<T>;
    } catch (error: unknown) {
      this.loggerService.error("Error in cleanse", { error, item }, this.constructor.name);

      throw error;
    }
  }

  protected encodeLastEvaluatedKey(key: DynamoDB.DocumentClient.Key): string {
    try {
      this.loggerService.trace("encodeLastEvaluatedKey called", { key }, this.constructor.name);

      const encodedKey = Buffer.from(JSON.stringify(key)).toString("base64");

      return encodedKey;
    } catch (error: unknown) {
      this.loggerService.error("Error in encodeLastEvaluatedKey", { error, key }, this.constructor.name);

      throw error;
    }
  }

  protected decodeExclusiveStartKey(key: string): DynamoDB.DocumentClient.Key {
    try {
      this.loggerService.trace("decodeExclusiveStartKey called", { key }, this.constructor.name);

      const decodedKey = JSON.parse(Buffer.from(key, "base64").toString()) as unknown;

      if (!this.isDyanmoKey(decodedKey)) {
        throw new BadRequestError("Malformed start key");
      }

      return decodedKey;
    } catch (error: unknown) {
      this.loggerService.error("Error in decodeExclusiveStartKey", { error, key }, this.constructor.name);

      throw error;
    }
  }

  private chunkArrayInGroups<T>(arr: T[], size: number): T[][] {
    try {
      this.loggerService.trace("chunkArrayInGroups called", { arr, size }, this.constructor.name);

      const arrayOfArrays: T[][] = [];

      for (let i = 0; i < arr.length; i += size) {
        arrayOfArrays.push(arr.slice(i, i + size));
      }

      return arrayOfArrays;
    } catch (error: unknown) {
      this.loggerService.error("Error in chunkArrayInGroups", { error, arr, size }, this.constructor.name);

      throw error;
    }
  }

  private isDyanmoKey(key: unknown): key is DynamoDB.DocumentClient.Key {
    try {
      this.loggerService.trace("isDyanmoKey called", { key }, this.constructor.name);

      return Object.prototype.toString.call(key) === "[object Object]";
    } catch (error: unknown) {
      this.loggerService.error("Error in isDyanmoKey", { error, key }, this.constructor.name);

      throw error;
    }
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
