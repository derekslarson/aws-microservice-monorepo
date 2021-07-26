// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// import { Role } from "@yac/core";
// import axios from "axios";
// import { generateRandomString, getAccessTokenByEmail } from "../../../../e2e/util";
// import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
// import { RawConversation } from "../../src/repositories/conversation.dynamo.repository";
// import { UserId } from "../../src/types/userId.type";
// import { createConversationUserRelationship, createGroupConversation, createRandomUser } from "../util";

// describe("GET /users/{userId}/groups (Get Groups by User Id)", () => {
//   const baseUrl = process.env.baseUrl as string;

//   const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;

//   describe("under normal conditions", () => {
//     let userId: UserId;
//     let accessToken: string;
//     let group: RawConversation;
//     let groupTwo: RawConversation;

//     beforeAll(async () => {
//       // We have to fetch a new base user and access token here to prevent bleed over from other tests
//       const { user } = await createRandomUser();
//       userId = user.id;

//       ([ { accessToken }, { conversation: group }, { conversation: groupTwo } ] = await Promise.all([
//         getAccessTokenByEmail(user.email),
//         createGroupConversation({ createdBy: userId, name: generateRandomString(5), teamId: `${KeyPrefix.Team}${generateRandomString(5)}` }),
//         createGroupConversation({ createdBy: mockUserId, name: generateRandomString(5) }),
//       ]));

//       // We need to wait create the relationships in sequence, so that we can be sure of the return order in the test
//       await createConversationUserRelationship({ conversationId: group.id, userId, role: Role.Admin });
//       await createConversationUserRelationship({ conversationId: groupTwo.id, userId, role: Role.User });
//     });

//     describe("when not passed a 'limit' query param", () => {
//       it("returns a valid response", async () => {
//         const headers = { Authorization: `Bearer ${accessToken}` };

//         try {
//           const { status, data } = await axios.get(`${baseUrl}/users/${userId}/groups`, { headers });

//           expect(status).toBe(200);
//           expect(data).toEqual({
//             groups: [
//               {
//                 id: groupTwo.id,
//                 name: groupTwo.name,
//                 createdBy: groupTwo.createdBy,
//                 createdAt: groupTwo.createdAt,
//                 role: Role.User,
//               },
//               {
//                 id: group.id,
//                 name: group.name,
//                 createdBy: group.createdBy,
//                 createdAt: group.createdAt,
//                 teamId: group.teamId,
//                 role: Role.Admin,
//               },
//             ],
//           });
//         } catch (error) {
//           fail(error);
//         }
//       });
//     });

//     describe("when passed a 'limit' query param smaller than the number of entities", () => {
//       it("returns a valid response", async () => {
//         const params = { limit: 1 };
//         const headers = { Authorization: `Bearer ${accessToken}` };

//         try {
//           const { status, data } = await axios.get(`${baseUrl}/users/${userId}/groups`, { params, headers });

//           expect(status).toBe(200);
//           expect(data).toEqual({
//             groups: [
//               {
//                 id: groupTwo.id,
//                 name: groupTwo.name,
//                 createdBy: groupTwo.createdBy,
//                 createdAt: groupTwo.createdAt,
//                 role: Role.User,
//               },
//             ],
//             lastEvaluatedKey: jasmine.any(String),
//           });

//           const callTwoParams = { limit: 1, exclusiveStartKey: data.lastEvaluatedKey };

//           const { status: callTwoStatus, data: callTwoData } = await axios.get(`${baseUrl}/users/${userId}/groups`, { params: callTwoParams, headers });

//           expect(callTwoStatus).toBe(200);
//           expect(callTwoData).toEqual({
//             groups: [
//               {
//                 id: group.id,
//                 name: group.name,
//                 createdBy: group.createdBy,
//                 createdAt: group.createdAt,
//                 teamId: group.teamId,
//                 role: Role.Admin,
//               },
//             ],
//           });
//         } catch (error) {
//           fail(error);
//         }
//       });
//     });
//   });

//   describe("under error conditions", () => {
//     const userId = process.env.userId as UserId;
//     const accessToken = process.env.accessToken as string;

//     describe("when an access token is not passed in the headers", () => {
//       it("throws a 401 error", async () => {
//         const headers = {};

//         try {
//           await axios.get(`${baseUrl}/users/${userId}/groups`, { headers });

//           fail("Expected an error");
//         } catch (error) {
//           expect(error.response?.status).toBe(401);
//           expect(error.response?.statusText).toBe("Unauthorized");
//         }
//       });
//     });

//     describe("when a userId of a user different than the id in the accessToken is passed in", () => {
//       it("throws a 403 error", async () => {
//         const headers = { Authorization: `Bearer ${accessToken}` };

//         try {
//           await axios.get(`${baseUrl}/users/${mockUserId}/groups`, { headers });

//           fail("Expected an error");
//         } catch (error) {
//           expect(error.response?.status).toBe(403);
//           expect(error.response?.statusText).toBe("Forbidden");
//         }
//       });
//     });

//     describe("when passed invalid parameters", () => {
//       it("throws a 400 error with a valid structure", async () => {
//         const headers = { Authorization: `Bearer ${accessToken}` };

//         try {
//           await axios.get(`${baseUrl}/users/test/groups`, { headers });

//           fail("Expected an error");
//         } catch (error) {
//           expect(error.response?.status).toBe(400);
//           expect(error.response?.statusText).toBe("Bad Request");
//           expect(error.response?.data).toEqual({
//             message: "Error validating request",
//             validationErrors: { pathParameters: { userId: "Failed constraint check for string: Must be a user id" } },
//           });
//         }
//       });
//     });
//   });
// });
