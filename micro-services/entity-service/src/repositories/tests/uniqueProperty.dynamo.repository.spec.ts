/* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, generateAwsResponse, LoggerService, Spied, TestSupport } from "@yac/util";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { EntityType } from "../../enums/entityType.enum";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { UniqueProperty as UniquePropertyEnum } from "../../enums/uniqueProperty.enum";
import { UserId } from "../../types/userId.type";
import { UniqueProperty, UniquePropertyDynamoRepository, UniquePropertyRepositoryInterface } from "../uniqueProperty.dynamo.repository";

interface UniquePropertyDynamoRepositoryWithAnyMethod extends UniquePropertyRepositoryInterface {
  [key: string]: any;
}

describe("UniquePropertyDynamoRepository", () => {
  let documentClient: Spied<DocumentClient>;
  let loggerService: Spied<LoggerService>;
  let uniquePropertyDynamoRepository: UniquePropertyDynamoRepositoryWithAnyMethod;
  const documentClientFactory: DocumentClientFactory = () => documentClient;

  const mockCoreTableName = "mock-core-table-name";
  const mockGsiOneIndexName = "mock-gsi-one-index-name";
  const mockGsiTwoIndexName = "mock-gsi-two-index-name";
  const mockGsiThreeIndexName = "mock-gsi-three-index-name";

  const mockEnvConfig = {
    tableNames: { core: mockCoreTableName },
    globalSecondaryIndexNames: { one: mockGsiOneIndexName, two: mockGsiTwoIndexName, three: mockGsiThreeIndexName },
  };

  const mockProperty = UniquePropertyEnum.Email;
  const mockValue = "mock-email";
  const mockUserId: UserId = `${KeyPrefix.User}mock-id`;

  const mockUniqueProperty: UniqueProperty = {
    property: mockProperty,
    value: mockValue,
    userId: mockUserId,
  };

  const mockError = new Error("mock-error");

  beforeEach(() => {
    documentClient = TestSupport.spyOnClass(DocumentClient);
    loggerService = TestSupport.spyOnClass(LoggerService);

    uniquePropertyDynamoRepository = new UniquePropertyDynamoRepository(documentClientFactory, loggerService, mockEnvConfig);
  });

  describe("createUniqueProperty", () => {
    const params = { uniqueProperty: mockUniqueProperty };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.put.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.put with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockCoreTableName,
          ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
          Item: {
            entityType: EntityType.UniqueProperty,
            pk: mockProperty,
            sk: mockValue,
            ...mockUniqueProperty,
          },
        };

        await uniquePropertyDynamoRepository.createUniqueProperty(params);

        expect(documentClient.put).toHaveBeenCalledTimes(1);
        expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
      });

      it("returns a cleansed version of the created user", async () => {
        const response = await uniquePropertyDynamoRepository.createUniqueProperty(params);

        expect(response).toEqual({ uniqueProperty: mockUniqueProperty });
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.put throws an error", () => {
        beforeEach(() => {
          documentClient.put.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await uniquePropertyDynamoRepository.createUniqueProperty(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createUniqueProperty", { error: mockError, params }, uniquePropertyDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await uniquePropertyDynamoRepository.createUniqueProperty(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getUniqueProperty", () => {
    const params = { property: mockProperty, value: mockValue };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(uniquePropertyDynamoRepository, "get").and.returnValue(Promise.resolve(mockUniqueProperty));
      });

      it("calls this.get with the correct params", async () => {
        await uniquePropertyDynamoRepository.getUniqueProperty(params);

        expect(uniquePropertyDynamoRepository.get).toHaveBeenCalledTimes(1);
        expect(uniquePropertyDynamoRepository.get).toHaveBeenCalledWith({ Key: { pk: mockProperty, sk: mockValue } }, "Unique Property");
      });

      it("returns the user fetched via get", async () => {
        const response = await uniquePropertyDynamoRepository.getUniqueProperty(params);

        expect(response).toEqual({ uniqueProperty: mockUniqueProperty });
      });
    });

    describe("under error conditions", () => {
      describe("when this.get throws an error", () => {
        beforeEach(() => {
          spyOn(uniquePropertyDynamoRepository, "get").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await uniquePropertyDynamoRepository.getUniqueProperty(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getUniqueProperty", { error: mockError, params }, uniquePropertyDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await uniquePropertyDynamoRepository.getUniqueProperty(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("deleteUniqueProperty", () => {
    const params = { property: mockProperty, value: mockValue };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.delete.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.delete with the correct params", async () => {
        await uniquePropertyDynamoRepository.deleteUniqueProperty(params);

        expect(documentClient.delete).toHaveBeenCalledTimes(1);
        expect(documentClient.delete).toHaveBeenCalledWith({
          TableName: mockCoreTableName,
          Key: { pk: mockProperty, sk: mockValue },
        });
      });
    });

    describe("under error conditions", () => {
      describe("when this.delete throws an error", () => {
        beforeEach(() => {
          documentClient.delete.and.returnValue(generateAwsResponse(mockError, true));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await uniquePropertyDynamoRepository.deleteUniqueProperty(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in deleteUniqueProperty", { error: mockError, params }, uniquePropertyDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await uniquePropertyDynamoRepository.deleteUniqueProperty(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
