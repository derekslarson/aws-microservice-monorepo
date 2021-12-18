// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, DynamoProcessorServiceInterface, User, Team, DynamoProcessorServiceRecord } from "@yac/util";
// import { EntityType } from "../../enums/entityType.enum";
// import { TeamMediatorService, TeamMediatorServiceInterface } from "../../mediator-services/team.mediator.service";
// import { UserMediatorService, UserMediatorServiceInterface } from "../../mediator-services/user.mediator.service";
// import { UserAddedToTeamSnsService, UserAddedToTeamSnsServiceInterface } from "../../sns-services/userAddedToTeam.sns.service";
// import { UserAddedToTeamDynamoProcessorService } from "../userAddedToTeam.dynamo.processor.service";

// describe("UserAddedToTeamDynamoProcessorService", () => {
//   let loggerService: Spied<LoggerService>;
//   let userAddedToTeamSnsService: Spied<UserAddedToTeamSnsServiceInterface>;
//   let teamMediatorService: Spied<TeamMediatorServiceInterface>;
//   let userMediatorService: Spied<UserMediatorServiceInterface>;
//   let userAddedToTeamDynamoProcessorService: DynamoProcessorServiceInterface;

//   const mockCoreTableName = "mock-core-table-name";
//   const mockConfig = { tableNames: { core: mockCoreTableName } };
//   const mockUserIdOne = "user-mock-id-one";
//   const mockUserIdTwo = "user-mock-id-two";
//   const mockTeamId = "team-mock-id";

//   const mockUserOne: User = {
//     id: mockUserIdOne,
//     image: "mock-image",
//   };

//   const mockUserTwo: User = {
//     id: mockUserIdTwo,
//     image: "mock-image",
//   };

//   const mockTeam: Team = {
//     id: mockTeamId,
//     name: "mock-name",
//     image: "mock-image",
//     createdBy: "user-mock-id",
//     organizationId: "organization-123",
//   };

//   const mockRecord: DynamoProcessorServiceRecord = {
//     eventName: "INSERT",
//     tableName: mockCoreTableName,
//     oldImage: {},
//     newImage: {
//       entityType: EntityType.TeamUserRelationship,
//       teamId: mockTeamId,
//       userId: mockUserIdOne,
//     },
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     userAddedToTeamSnsService = TestSupport.spyOnClass(UserAddedToTeamSnsService);
//     teamMediatorService = TestSupport.spyOnClass(TeamMediatorService);
//     userMediatorService = TestSupport.spyOnClass(UserMediatorService);

//     userAddedToTeamDynamoProcessorService = new UserAddedToTeamDynamoProcessorService(loggerService, userAddedToTeamSnsService, teamMediatorService, userMediatorService, mockConfig);
//   });

//   describe("determineRecordSupport", () => {
//     describe("under normal conditions", () => {
//       describe("when passed a record that fits all necessary conditions", () => {
//         it("returns true", () => {
//           const result = userAddedToTeamDynamoProcessorService.determineRecordSupport(mockRecord);

//           expect(result).toBe(true);
//         });
//       });

//       describe("when passed a record that isn't in the core table", () => {
//         const record = {
//           ...mockRecord,
//           tableName: "test",
//         };

//         it("returns false", () => {
//           const result = userAddedToTeamDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't a team-user-relationship", () => {
//         const record = {
//           ...mockRecord,
//           newImage: {
//             ...mockRecord.newImage,
//             entityType: EntityType.Team,
//           },
//         };

//         it("returns false", () => {
//           const result = userAddedToTeamDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't an insert", () => {
//         const record = {
//           ...mockRecord,
//           eventName: "MODIFY" as const,
//         };

//         it("returns false", () => {
//           const result = userAddedToTeamDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });
//     });
//   });

//   describe("processRecord", () => {
//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         userMediatorService.getUsersByTeamId.and.returnValue(Promise.resolve({ users: [ mockUserOne, mockUserTwo ] }));
//         userMediatorService.getUser.and.returnValue(Promise.resolve({ user: mockUserOne }));
//         teamMediatorService.getTeam.and.returnValue(Promise.resolve({ team: mockTeam }));
//         userAddedToTeamSnsService.sendMessage.and.returnValue(Promise.resolve());
//       });

//       it("calls userMediatorService.getUsersByTeamId with the correct parameters", async () => {
//         await userAddedToTeamDynamoProcessorService.processRecord(mockRecord);

//         expect(userMediatorService.getUsersByTeamId).toHaveBeenCalledTimes(1);
//         expect(userMediatorService.getUsersByTeamId).toHaveBeenCalledWith({ teamId: mockTeamId });
//       });

//       it("calls userMediatorService.getUser with the correct parameters", async () => {
//         await userAddedToTeamDynamoProcessorService.processRecord(mockRecord);

//         expect(userMediatorService.getUser).toHaveBeenCalledTimes(1);
//         expect(userMediatorService.getUser).toHaveBeenCalledWith({ userId: mockUserIdOne });
//       });

//       it("calls teamMediatorService.getTeam with the correct parameters", async () => {
//         await userAddedToTeamDynamoProcessorService.processRecord(mockRecord);

//         expect(teamMediatorService.getTeam).toHaveBeenCalledTimes(1);
//         expect(teamMediatorService.getTeam).toHaveBeenCalledWith({ teamId: mockTeamId });
//       });

//       it("calls userAddedToTeamSnsService.sendMessage with the correct parameters", async () => {
//         await userAddedToTeamDynamoProcessorService.processRecord(mockRecord);

//         expect(userAddedToTeamSnsService.sendMessage).toHaveBeenCalledTimes(1);
//         expect(userAddedToTeamSnsService.sendMessage).toHaveBeenCalledWith({ team: mockTeam, user: mockUserOne, teamMemberIds: [ mockUserIdOne, mockUserIdTwo ] });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when userMediatorService.getUsersByTeamId throws an error", () => {
//         beforeEach(() => {
//           userMediatorService.getUsersByTeamId.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userAddedToTeamDynamoProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, userAddedToTeamDynamoProcessorService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userAddedToTeamDynamoProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
