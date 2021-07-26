// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// import axios from "axios";
// import { Role, WithRole } from "@yac/core";
// import { generateRandomString } from "../../../../e2e/util";
// import { Team } from "../../src/mediator-services/team.mediator.service";
// import { EntityType } from "../../src/enums/entityType.enum";
// import { UserId } from "../../src/types/userId.type";
// import { getTeam, getTeamUserRelationship } from "../util";
// import { KeyPrefix } from "../../src/enums/keyPrefix.enum";

// describe("POST /users/{userId}/teams (Create Team)", () => {
//   const baseUrl = process.env.baseUrl as string;
//   const userId = process.env.userId as UserId;
//   const accessToken = process.env.accessToken as string;

//   describe("under normal conditions", () => {
//     it("returns a valid response", async () => {
//       const name = generateRandomString(5);
//       const body = { name };
//       const headers = { Authorization: `Bearer ${accessToken}` };

//       try {
//         const { status, data } = await axios.post<{ team: WithRole<Team>; }>(`${baseUrl}/users/${userId}/teams`, body, { headers });

//         expect(status).toBe(201);
//         expect(data).toEqual({
//           team: {
//             id: jasmine.stringMatching(new RegExp(`${KeyPrefix.Team}.*`)),
//             name,
//             createdBy: userId,
//             role: Role.Admin,
//           },
//         });
//       } catch (error) {
//         fail(error);
//       }
//     });

//     it("creates a valid Team entity", async () => {
//       const name = generateRandomString(5);
//       const body = { name };
//       const headers = { Authorization: `Bearer ${accessToken}` };

//       try {
//         const { data } = await axios.post<{ team: Team; }>(`${baseUrl}/users/${userId}/teams`, body, { headers });

//         const { team } = await getTeam({ teamId: data.team.id });

//         expect(team).toEqual({
//           entityType: EntityType.Team,
//           pk: data.team.id,
//           sk: data.team.id,
//           id: data.team.id,
//           createdBy: userId,
//           name,
//         });
//       } catch (error) {
//         fail(error);
//       }
//     });

//     it("creates a valid TeamUserRelationship entity", async () => {
//       const name = generateRandomString(5);
//       const body = { name };
//       const headers = { Authorization: `Bearer ${accessToken}` };

//       try {
//         const { data } = await axios.post<{ team: Team; }>(`${baseUrl}/users/${userId}/teams`, body, { headers });

//         const { teamUserRelationship } = await getTeamUserRelationship({ teamId: data.team.id, userId });

//         expect(teamUserRelationship).toEqual({
//           entityType: EntityType.TeamUserRelationship,
//           pk: data.team.id,
//           sk: userId,
//           gsi1pk: userId,
//           gsi1sk: data.team.id,
//           teamId: data.team.id,
//           role: Role.Admin,
//           userId,
//         });
//       } catch (error) {
//         fail(error);
//       }
//     });
//   });

//   describe("under error conditions", () => {
//     describe("when an access token is not passed in the headers", () => {
//       it("throws a 401 error", async () => {
//         const name = generateRandomString(5);
//         const body = { name };
//         const headers = {};

//         try {
//           await axios.post(`${baseUrl}/users/${userId}/teams`, body, { headers });

//           fail("Expected an error");
//         } catch (error) {
//           expect(error.response?.status).toBe(401);
//           expect(error.response?.statusText).toBe("Unauthorized");
//         }
//       });
//     });

//     describe("when passed invalid parameters", () => {
//       it("throws a 400 error with a valid structure", async () => {
//         const body = {};
//         const headers = { Authorization: `Bearer ${accessToken}` };

//         try {
//           await axios.post(`${baseUrl}/users/test/teams`, body, { headers });

//           fail("Expected an error");
//         } catch (error) {
//           expect(error.response?.status).toBe(400);
//           expect(error.response?.statusText).toBe("Bad Request");
//           expect(error.response?.data).toEqual({
//             message: "Error validating request",
//             validationErrors: {
//               pathParameters: { userId: "Failed constraint check for string: Must be a user id" },
//               body: { name: "Expected string, but was missing" },
//             },
//           });
//         }
//       });
//     });
//   });
// });
