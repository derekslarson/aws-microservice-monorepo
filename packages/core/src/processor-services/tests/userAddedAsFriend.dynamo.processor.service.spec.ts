// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, DynamoProcessorServiceInterface, User, DynamoProcessorServiceRecord } from "@yac/util";
// import { EntityType } from "../../enums/entityType.enum";
// import { KeyPrefix } from "../../enums/keyPrefix.enum";
// import { UserMediatorService, UserMediatorServiceInterface } from "../../mediator-services/user.mediator.service";
// import { UserAddedAsFriendSnsService, UserAddedAsFriendSnsServiceInterface } from "../../sns-services/userAddedAsFriend.sns.service";
// import { FriendConvoId } from "../../types/friendConvoId.type";
// import { UserAddedAsFriendDynamoProcessorService } from "../oneOnOneCreated.dynamo.processor.service";

// describe("UserAddedAsFriendDynamoProcessorService", () => {
//   let loggerService: Spied<LoggerService>;
//   let userAddedAsFriendSnsService: Spied<UserAddedAsFriendSnsServiceInterface>;
//   let userMediatorService: Spied<UserMediatorServiceInterface>;
//   let userAddedAsFriendDynamoProcessorService: DynamoProcessorServiceInterface;

//   const mockCoreTableName = "mock-core-table-name";
//   const mockConfig = { tableNames: { core: mockCoreTableName } };
//   const mockUserIdOne = "user-mock-id-one";
//   const mockUserIdTwo = "user-mock-id-two";
//   const mockFriendConversationId: FriendConvoId = `${KeyPrefix.FriendConversation}${mockUserIdOne}-${mockUserIdTwo}`;

//   const mockUserOne: User = {
//     id: mockUserIdOne,
//     image: "mock-image",
//   };

//   const mockUserTwo: User = {
//     id: mockUserIdTwo,
//     image: "mock-image",
//   };

//   const mockRecord: DynamoProcessorServiceRecord = {
//     eventName: "INSERT",
//     tableName: mockCoreTableName,
//     oldImage: {},
//     newImage: {
//       entityType: EntityType.FriendConversation,
//       id: mockFriendConversationId,
//       createdBy: mockUserIdOne,
//     },
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     userAddedAsFriendSnsService = TestSupport.spyOnClass(UserAddedAsFriendSnsService);
//     userMediatorService = TestSupport.spyOnClass(UserMediatorService);

//     userAddedAsFriendDynamoProcessorService = new UserAddedAsFriendDynamoProcessorService(loggerService, userAddedAsFriendSnsService, userMediatorService, mockConfig);
//   });

//   describe("determineRecordSupport", () => {
//     describe("under normal conditions", () => {
//       describe("when passed a record that fits all necessary conditions", () => {
//         it("returns true", () => {
//           const result = userAddedAsFriendDynamoProcessorService.determineRecordSupport(mockRecord);

//           expect(result).toBe(true);
//         });
//       });

//       describe("when passed a record that isn't in the core table", () => {
//         const record = {
//           ...mockRecord,
//           tableName: "test",
//         };

//         it("returns false", () => {
//           const result = userAddedAsFriendDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't a friend-conversation", () => {
//         const record = {
//           ...mockRecord,
//           newImage: {
//             ...mockRecord.newImage,
//             entityType: EntityType.TeamUserRelationship,
//           },
//         };

//         it("returns false", () => {
//           const result = userAddedAsFriendDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't an insert", () => {
//         const record = {
//           ...mockRecord,
//           eventName: "MODIFY" as const,
//         };

//         it("returns false", () => {
//           const result = userAddedAsFriendDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });
//     });
//   });

//   describe("processRecord", () => {
//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         userMediatorService.getUser.and.returnValues(Promise.resolve({ user: mockUserOne }), Promise.resolve({ user: mockUserTwo }));
//         userAddedAsFriendSnsService.sendMessage.and.returnValue(Promise.resolve());
//       });

//       it("calls userMediatorService.getUser with the correct parameters", async () => {
//         await userAddedAsFriendDynamoProcessorService.processRecord(mockRecord);

//         expect(userMediatorService.getUser).toHaveBeenCalledTimes(2);
//         expect(userMediatorService.getUser).toHaveBeenCalledWith({ userId: mockUserIdOne });
//         expect(userMediatorService.getUser).toHaveBeenCalledWith({ userId: mockUserIdTwo });
//       });

//       it("calls userAddedAsFriendSnsService.sendMessage with the correct parameters", async () => {
//         await userAddedAsFriendDynamoProcessorService.processRecord(mockRecord);

//         expect(userAddedAsFriendSnsService.sendMessage).toHaveBeenCalledTimes(1);
//         expect(userAddedAsFriendSnsService.sendMessage).toHaveBeenCalledWith({ addingUser: mockUserOne, addedUser: mockUserTwo });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when userAddedAsFriendSnsService.sendMessage throws an error", () => {
//         beforeEach(() => {
//           userMediatorService.getUser.and.returnValues(Promise.resolve({ user: mockUserOne }), Promise.resolve({ user: mockUserTwo }));
//           userAddedAsFriendSnsService.sendMessage.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userAddedAsFriendDynamoProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, userAddedAsFriendDynamoProcessorService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userAddedAsFriendDynamoProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
