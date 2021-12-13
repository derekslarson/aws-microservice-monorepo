// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, SnsFactory, User, Group } from "@yac/util";
// import SNS from "aws-sdk/clients/sns";
// import { GroupCreatedSnsService, GroupCreatedSnsServiceInterface } from "../groupCreated.sns.service";

// interface GroupCreatedSnsServiceWithAnyMethod extends GroupCreatedSnsServiceInterface {
//   [key: string]: any;
// }

// describe("GroupCreatedSnsService", () => {
//   let sns: Spied<SNS>;
//   const snsFactory: SnsFactory = () => sns as unknown as SNS;

//   let loggerService: Spied<LoggerService>;
//   let groupCreatedSnsService: GroupCreatedSnsServiceWithAnyMethod;

//   const mockGroupCreatedSnsTopicArn = "mock-group-created-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { groupCreated: mockGroupCreatedSnsTopicArn } };
//   const mockGroupId = "group_id";
//   const mockUserA: User["id"] = "user-mock-id";
//   const mockUserB: User["id"] = "user-mock-b-id";

//   const mockGroup: Group = {
//     id: mockGroupId,
//     name: "mock-name",
//     image: "mock-image",
//     createdBy: "user-mock-id",
//     createdAt: new Date().toISOString(),
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);

//     groupCreatedSnsService = new GroupCreatedSnsService(loggerService, snsFactory, mockConfig);
//   });

//   describe("sendMessage", () => {
//     const mockMessage = { group: mockGroup, groupMemberIds: [ mockUserA, mockUserB ] };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(groupCreatedSnsService, "publish").and.returnValue(Promise.resolve());
//       });
//       it("calls this.publish with the correct params", async () => {
//         await groupCreatedSnsService.sendMessage(mockMessage);

//         expect(groupCreatedSnsService.publish).toHaveBeenCalledTimes(1);
//         expect(groupCreatedSnsService.publish).toHaveBeenCalledWith(mockMessage);
//       });
//     });

//     describe("under error conditions", () => {
//       beforeEach(() => {
//         spyOn(groupCreatedSnsService, "publish").and.throwError(mockError);
//       });

//       describe("when this.publish throws", () => {
//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await groupCreatedSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, groupCreatedSnsService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await groupCreatedSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
