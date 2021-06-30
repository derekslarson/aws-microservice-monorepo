// /* eslint-disable @typescript-eslint/unbound-method */
// import { DocumentClientFactory, generateAwsResponse, IdService, LoggerService, Role, Spied, TestSupport } from "@yac/core";
// import { DocumentClient } from "aws-sdk/clients/dynamodb";
// import { User } from "../../models/user.model";
// import { UserDynamoRepository, UserRepositoryInterface } from "../user.dynamo.repository";

// interface UserDynamoRepositoryWithAnyMethod extends UserRepositoryInterface {
//   [key: string]: any;
// }

// describe("UserDynamoRepository", () => {
//   let documentClient: Spied<DocumentClient>;
//   let idService: Spied<IdService>;
//   let loggerService: Spied<LoggerService>;
//   let userDynamoRepository: UserDynamoRepositoryWithAnyMethod;
//   const documentClientFactory: DocumentClientFactory = () => documentClient;

//   const mockCoreTableName = "mock-core-table-name";
//   const mockGsiOneIndexName = "mock-gsi-one-index-name";
//   const mockEnvConfig = {
//     tableNames: { core: mockCoreTableName },
//     globalSecondaryIndexNames: { one: mockGsiOneIndexName },
//   };
//   const mockCognitoId = "mock-id";
//   const mockUserId = `USER-${mockCognitoId}`;
//   const mockTeamId = "mock-teamId";
//   const mockKey = { pk: mockTeamId, sk: mockUserId };
//   const mockRole = Role.User;
//   const mockEmail = "mock@email.com";
//   const mockUser: User = {
//     id: mockUserId,
//     email: mockEmail,
//   };
//   const mockError = new Error("mock-error");
//   const mockTeamUserRelationship = { userId: mockUserId, teamId: mockTeamId, role: mockRole };

//   beforeEach(() => {
//     documentClient = TestSupport.spyOnClass(DocumentClient);
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     idService = TestSupport.spyOnClass(IdService);

//     userDynamoRepository = new UserDynamoRepository(documentClientFactory, idService, loggerService, mockEnvConfig);
//   });

//   describe("createUser", () => {
//     const mockUserInput: User = {
//       id: mockCognitoId,
//       email: mockEmail,
//     };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         documentClient.put.and.returnValue(generateAwsResponse({}));
//       });

//       it("calls documentClient.put with the correct params", async () => {
//         const expectedDynamoInput = {
//           TableName: mockCoreTableName,
//           Item: {
//             type: "USER",
//             pk: mockUserId,
//             sk: mockUserId,
//             id: mockUserId,
//             email: mockEmail,
//           },
//         };

//         await userDynamoRepository.createUser(mockUserInput);

//         expect(documentClient.put).toHaveBeenCalledTimes(1);
//         expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
//       });

//       it("returns a cleansed version of the created user", async () => {
//         const createdUser = await userDynamoRepository.createUser(mockUserInput);

//         expect(createdUser).toEqual(mockUser);
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when documentClient.put throws an error", () => {
//         beforeEach(() => {
//           documentClient.put.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userDynamoRepository.createUser(mockUserInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in createUser", { error: mockError, user: mockUserInput }, userDynamoRepository.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userDynamoRepository.createUser(mockUserInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });

//   describe("getUsersByTeamId", () => {
//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(userDynamoRepository, "query").and.returnValue({ Items: [ mockTeamUserRelationship ], LastEvaluatedKey: mockKey });
//       });

//       it("calls this.query with the correct params", async () => {
//         const expectedDynamoInput = {
//           KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
//           ExpressionAttributeNames: {
//             "#pk": "pk",
//             "#sk": "sk",
//           },
//           ExpressionAttributeValues: {
//             ":pk": mockTeamId,
//             ":user": "USER-",
//           },
//         };

//         await userDynamoRepository.getUsersByTeamId(mockTeamId);

//         expect(userDynamoRepository.query).toHaveBeenCalledTimes(1);
//         expect(userDynamoRepository.query).toHaveBeenCalledWith(expectedDynamoInput);
//       });

//       it("calls this.batchGet with the correct params", async () => {
//         const expectedDynamoInput = {
//           KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
//           ExpressionAttributeNames: {
//             "#pk": "pk",
//             "#sk": "sk",
//           },
//           ExpressionAttributeValues: {
//             ":pk": mockTeamId,
//             ":user": "USER-",
//           },
//         };

//         await userDynamoRepository.getUsersByTeamId(mockTeamId);

//         expect(userDynamoRepository.query).toHaveBeenCalledTimes(1);
//         expect(userDynamoRepository.query).toHaveBeenCalledWith(expectedDynamoInput);
//       });

//       it("returns the Items returned by this.query", async () => {
//         const userUserRelationships = await userDynamoRepository.getUsersByTeamId(mockUserId);

//         expect(userUserRelationships).toEqual({ users: [ { ...mockUser, role: mockRole } ] });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when this.query throws an error", () => {
//         beforeEach(() => {
//           spyOn(userDynamoRepository, "query").and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userDynamoRepository.getUsersByTeamId(mockUserId);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in getUsersByTeamId", { error: mockError, userId: mockUserId }, userDynamoRepository.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userDynamoRepository.getUsersByTeamId(mockUserId);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
