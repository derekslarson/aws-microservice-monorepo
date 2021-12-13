// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, DynamoProcessorServiceInterface, User, Group, DynamoProcessorServiceRecord } from "@yac/util";
// import { ConversationType } from "../../enums/conversationType.enum";
// import { EntityType } from "../../enums/entityType.enum";
// import { GroupMediatorService, GroupMediatorServiceInterface } from "../../mediator-services/group.mediator.service";
// import { UserMediatorService, UserMediatorServiceInterface } from "../../mediator-services/user.mediator.service";
// import { UserAddedToGroupSnsService, UserAddedToGroupSnsServiceInterface } from "../../sns-services/userAddedToGroup.sns.service";
// import { UserAddedToGroupDynamoProcessorService } from "../userAddedToGroup.dynamo.processor.service";

// describe("UserAddedToGroupDynamoProcessorService", () => {
//   let loggerService: Spied<LoggerService>;
//   let userAddedToGroupSnsService: Spied<UserAddedToGroupSnsServiceInterface>;
//   let groupMediatorService: Spied<GroupMediatorServiceInterface>;
//   let userMediatorService: Spied<UserMediatorServiceInterface>;
//   let userAddedToGroupDynamoProcessorService: DynamoProcessorServiceInterface;

//   const mockCoreTableName = "mock-core-table-name";
//   const mockConfig = { tableNames: { core: mockCoreTableName } };
//   const mockUserIdOne = "user-mock-id-one";
//   const mockUserIdTwo = "user-mock-id-two";
//   const mockGroupId = "group_mock-id";

//   const mockUserOne: User = {
//     id: mockUserIdOne,
//     image: "mock-image",
//   };

//   const mockUserTwo: User = {
//     id: mockUserIdTwo,
//     image: "mock-image",
//   };

//   const mockGroup: Group = {
//     id: mockGroupId,
//     name: "mock-name",
//     image: "mock-image",
//     createdBy: "user-mock-id",
//     createdAt: new Date().toISOString(),
//   };

//   const mockRecord: DynamoProcessorServiceRecord = {
//     eventName: "INSERT",
//     tableName: mockCoreTableName,
//     oldImage: {},
//     newImage: {
//       entityType: EntityType.ConversationUserRelationship,
//       type: ConversationType.Group,
//       conversationId: mockGroupId,
//       userId: mockUserIdOne,
//     },
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     userAddedToGroupSnsService = TestSupport.spyOnClass(UserAddedToGroupSnsService);
//     groupMediatorService = TestSupport.spyOnClass(GroupMediatorService);
//     userMediatorService = TestSupport.spyOnClass(UserMediatorService);

//     userAddedToGroupDynamoProcessorService = new UserAddedToGroupDynamoProcessorService(loggerService, userAddedToGroupSnsService, groupMediatorService, userMediatorService, mockConfig);
//   });

//   describe("determineRecordSupport", () => {
//     describe("under normal conditions", () => {
//       describe("when passed a record that fits all necessary conditions", () => {
//         it("returns true", () => {
//           const result = userAddedToGroupDynamoProcessorService.determineRecordSupport(mockRecord);

//           expect(result).toBe(true);
//         });
//       });

//       describe("when passed a record that isn't in the core table", () => {
//         const record = {
//           ...mockRecord,
//           tableName: "test",
//         };

//         it("returns false", () => {
//           const result = userAddedToGroupDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't a conversation-user-relationship", () => {
//         const record = {
//           ...mockRecord,
//           newImage: {
//             ...mockRecord.newImage,
//             entityType: EntityType.TeamUserRelationship,
//           },
//         };

//         it("returns false", () => {
//           const result = userAddedToGroupDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't a group-conversation-user-relationship", () => {
//         const record = {
//           ...mockRecord,
//           newImage: {
//             ...mockRecord.newImage,
//             type: ConversationType.Meeting,
//           },
//         };

//         it("returns false", () => {
//           const result = userAddedToGroupDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't an insert", () => {
//         const record = {
//           ...mockRecord,
//           eventName: "MODIFY" as const,
//         };

//         it("returns false", () => {
//           const result = userAddedToGroupDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });
//     });
//   });

//   describe("processRecord", () => {
//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         userMediatorService.getUsersByGroupId.and.returnValue(Promise.resolve({ users: [ mockUserOne, mockUserTwo ] }));
//         userMediatorService.getUser.and.returnValue(Promise.resolve({ user: mockUserOne }));
//         groupMediatorService.getGroup.and.returnValue(Promise.resolve({ group: mockGroup }));
//         userAddedToGroupSnsService.sendMessage.and.returnValue(Promise.resolve());
//       });

//       it("calls userMediatorService.getUsersByGroupId with the correct parameters", async () => {
//         await userAddedToGroupDynamoProcessorService.processRecord(mockRecord);

//         expect(userMediatorService.getUsersByGroupId).toHaveBeenCalledTimes(1);
//         expect(userMediatorService.getUsersByGroupId).toHaveBeenCalledWith({ groupId: mockGroupId });
//       });

//       it("calls userMediatorService.getUser with the correct parameters", async () => {
//         await userAddedToGroupDynamoProcessorService.processRecord(mockRecord);

//         expect(userMediatorService.getUser).toHaveBeenCalledTimes(1);
//         expect(userMediatorService.getUser).toHaveBeenCalledWith({ userId: mockUserIdOne });
//       });

//       it("calls groupMediatorService.getGroup with the correct parameters", async () => {
//         await userAddedToGroupDynamoProcessorService.processRecord(mockRecord);

//         expect(groupMediatorService.getGroup).toHaveBeenCalledTimes(1);
//         expect(groupMediatorService.getGroup).toHaveBeenCalledWith({ groupId: mockGroupId });
//       });

//       it("calls userAddedToGroupSnsService.sendMessage with the correct parameters", async () => {
//         await userAddedToGroupDynamoProcessorService.processRecord(mockRecord);

//         expect(userAddedToGroupSnsService.sendMessage).toHaveBeenCalledTimes(1);
//         expect(userAddedToGroupSnsService.sendMessage).toHaveBeenCalledWith({ group: mockGroup, user: mockUserOne, groupMemberIds: [ mockUserIdOne, mockUserIdTwo ] });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when userMediatorService.getUsersByGroupId throws an error", () => {
//         beforeEach(() => {
//           userMediatorService.getUsersByGroupId.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userAddedToGroupDynamoProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, userAddedToGroupDynamoProcessorService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userAddedToGroupDynamoProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
