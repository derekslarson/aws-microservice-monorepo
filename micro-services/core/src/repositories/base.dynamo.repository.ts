import "reflect-metadata";
import { injectable, unmanaged } from "inversify";
import { DynamoDB } from "aws-sdk";
import { LoggerServiceInterface } from "../services/logger.service";
import { DocumentClientFactory } from "../factories/documentClient.factory";
import { IdServiceInterface } from "../services/id.service";
import { NotFoundError } from "../errors/notFound.error";
import { RecursivePartial } from "../types/recursivePartial.type";

@injectable()
export abstract class BaseDynamoRepository<T> {
  protected tableName: string;

  protected globalSecondaryIndexes: string;

  protected documentClient: DynamoDB.DocumentClient;

  constructor(
  @unmanaged() tableName: string,
    @unmanaged() documentClientFactory: DocumentClientFactory,
    @unmanaged() protected idService: IdServiceInterface,
    @unmanaged() protected loggerService: LoggerServiceInterface,
  ) {
    this.tableName = tableName;
    this.documentClient = documentClientFactory();
  }

  protected async getByPrimaryKey(id: string): Promise<T> {
    try {
      this.loggerService.trace("getByPrimaryKey called", { id }, this.constructor.name);

      const getItemInput: DynamoDB.DocumentClient.GetItemInput = {
        TableName: this.tableName,
        Key: { id },
      };

      const queryResponse = await this.documentClient.get(getItemInput).promise();

      const item = queryResponse?.Item;

      if (!item) {
        throw new NotFoundError("Item not found.");
      }

      return item as T;
    } catch (error: unknown) {
      this.loggerService.error("Error in getByPrimaryKey", { error, id }, this.constructor.name);

      throw error;
    }
  }

  protected async deleteByPrimaryKey(id: string): Promise<void> {
    try {
      this.loggerService.trace("deleteByPrimaryKey called", { id }, this.constructor.name);

      const deleteItemInput: DynamoDB.DocumentClient.DeleteItemInput = {
        TableName: this.tableName,
        Key: { id },
      };

      await this.documentClient.delete(deleteItemInput).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteByPrimaryKey", { error, id }, this.constructor.name);

      throw error;
    }
  }

  protected async getAll(): Promise<T[]> {
    try {
      this.loggerService.trace("getAll called", {}, this.constructor.name);

      const scanInput: DynamoDB.DocumentClient.ScanInput = { TableName: this.tableName };

      const queryResponse = await this.documentClient.scan(scanInput).promise();

      return (queryResponse.Items as T[]) || [];
    } catch (error: unknown) {
      this.loggerService.error("Error in getAll", { error }, this.constructor.name);

      throw error;
    }
  }

  protected async insert(item: Omit<T, "id">): Promise<T> {
    try {
      this.loggerService.trace("insert called", { item }, this.constructor.name);

      const itemToInsert = {
        ...item,
        id: this.idService.generateId(),
      } as unknown as T;

      const putItemInput: DynamoDB.DocumentClient.PutItemInput = {
        TableName: this.tableName,
        Item: itemToInsert,
      };

      await this.documentClient.put(putItemInput).promise();

      return itemToInsert;
    } catch (error: unknown) {
      this.loggerService.error("Error in insert", { error, item }, this.constructor.name);

      throw error;
    }
  }

  protected async insertWithIdIncluded(item: T): Promise<T> {
    try {
      this.loggerService.trace("insertWithIdIncluded called", { item }, this.constructor.name);

      const putItemInput: DynamoDB.DocumentClient.PutItemInput = {
        TableName: this.tableName,
        Item: item,
      };

      await this.documentClient.put(putItemInput).promise();

      return item;
    } catch (error: unknown) {
      this.loggerService.error("Error in insertWithIdIncluded", { error, item }, this.constructor.name);

      throw error;
    }
  }

  protected async partialUpdate(id: string, update: RecursivePartial<Omit<T, "id">>): Promise<T> {
    try {
      this.loggerService.trace("partialUpdate called", { update }, this.constructor.name);

      const updateItemInput = this.generatePartialUpdateItemInput(id, update);

      const updateResponse = await this.documentClient.update(updateItemInput).promise();

      return updateResponse.Attributes as T;
    } catch (error: unknown) {
      this.loggerService.error("Error in partialUpdate", { error, update }, this.constructor.name);

      throw error;
    }
  }

  private generatePartialUpdateItemInput(
    id: string,
    rootLevelOrNestedObject: Record<string, unknown>,
    previousUpdateItemInput?: DynamoDB.DocumentClient.UpdateItemInput,
    previousExpressionAttributePath?: string,
  ): DynamoDB.DocumentClient.UpdateItemInput {
    try {
      this.loggerService.trace(
        "generatePartialUpdateItemInput called",
        {
          id,
          rootLevelOrNestedObject,
          previousUpdateItemInput,
          previousExpressionAttributePath,
        },
        this.constructor.name,
      );

      const baseUpdateItemInput: DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: this.tableName,
        Key: { id },
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
          return this.generatePartialUpdateItemInput(id, value as Record<string, unknown>, updateItemInput, expressionAttributePath);
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
      this.loggerService.error(
        "Error in generatePartialUpdateItemInput",
        {
          error,
          id,
          rootLevelOrNestedObject,
          previousUpdateItemInput,
          previousExpressionAttributePath,
        },
        this.constructor.name,
      );

      throw error;
    }
  }
}
