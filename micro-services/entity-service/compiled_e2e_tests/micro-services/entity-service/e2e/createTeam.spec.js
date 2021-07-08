"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
const jasmine_1 = __importDefault(require("jasmine"));
const axios_1 = __importDefault(require("axios"));
const core_1 = require("@yac/core");
const e2e_util_1 = require("../../../config/jasmine/e2e.util");
const entityType_enum_1 = require("../src/enums/entityType.enum");
describe("POST /users/{user.id}/teams", () => {
    const environment = process.env.environment;
    const baseUrl = `https://${environment}.yacchat.com/entity-service`;
    let user;
    let accessToken;
    beforeAll(async () => {
        jasmine_1.default.DEFAULT_TIMEOUT_INTERVAL = 15000;
        user = await e2e_util_1.createRandomUser();
        ({ accessToken } = await e2e_util_1.getAccessTokenByEmail(user.email));
    });
    describe("under normal conditions", () => {
        it("returns a valid response", async () => {
            const name = e2e_util_1.generateRandomString(5);
            const body = { name };
            const headers = { Authorization: `Bearer ${accessToken}` };
            try {
                const { status, data } = await axios_1.default.post(`${baseUrl}/users/${user.id}/teams`, body, { headers });
                expect(status).toBe(201);
                expect(data.team).toBeDefined();
                expect(data.team.id).toMatch(/team-.*/);
                expect(data.team.name).toBe(name);
                expect(data.team.createdBy).toBe(user.id);
            }
            catch (error) {
                fail(error);
            }
        });
        it("creates a valid Team entity", async () => {
            const name = e2e_util_1.generateRandomString(5);
            const body = { name };
            const headers = { Authorization: `Bearer ${accessToken}` };
            try {
                const { data } = await axios_1.default.post(`${baseUrl}/users/${user.id}/teams`, body, { headers });
                const getTeamResponse = await e2e_util_1.documentClient.get({
                    TableName: process.env["core-table-name"],
                    Key: { pk: data.team.id, sk: data.team.id },
                }).promise();
                const team = getTeamResponse.Item;
                expect(team).toBeDefined();
                expect(team.entityType).toBe(entityType_enum_1.EntityType.Team);
                expect(team.pk).toBe(data.team.id);
                expect(team.sk).toBe(data.team.id);
                expect(team.id).toBe(data.team.id);
                expect(team.name).toBe(name);
                expect(team.createdBy).toBe(user.id);
            }
            catch (error) {
                fail(error);
            }
        });
        it("creates a valid TeamUserRelationship entity", async () => {
            const name = e2e_util_1.generateRandomString(5);
            const body = { name };
            const headers = { Authorization: `Bearer ${accessToken}` };
            try {
                const { data } = await axios_1.default.post(`${baseUrl}/users/${user.id}/teams`, body, { headers });
                const getTeamUserRelationshipResponse = await e2e_util_1.documentClient.get({
                    TableName: process.env["core-table-name"],
                    Key: { pk: data.team.id, sk: user.id },
                }).promise();
                const teamUserRelationship = getTeamUserRelationshipResponse.Item;
                expect(teamUserRelationship).toBeDefined();
                expect(teamUserRelationship.entityType).toBe(entityType_enum_1.EntityType.TeamUserRelationship);
                expect(teamUserRelationship.pk).toBe(data.team.id);
                expect(teamUserRelationship.sk).toBe(user.id);
                expect(teamUserRelationship.gsi1pk).toBe(user.id);
                expect(teamUserRelationship.gsi1sk).toBe(data.team.id);
                expect(teamUserRelationship.teamId).toBe(data.team.id);
                expect(teamUserRelationship.userId).toBe(user.id);
                expect(teamUserRelationship.role).toBe(core_1.Role.Admin);
            }
            catch (error) {
                fail(error);
            }
        });
    });
    describe("under error conditions", () => {
        describe("when an access token is not passed in the headers", () => {
            it("throws a 401 error", async () => {
                var _a, _b;
                const name = e2e_util_1.generateRandomString(5);
                const body = { name };
                const headers = {};
                try {
                    await axios_1.default.post(`${baseUrl}/users/${user.id}/teams`, body, { headers });
                    fail("Expected an error");
                }
                catch (error) {
                    const axiosError = error;
                    expect((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status).toBe(401);
                    expect((_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.statusText).toBe("Unauthorized");
                }
            });
        });
        fdescribe("when passed an invalid userId in the path", () => {
            it("throws a 400 error with a valid structure", async () => {
                var _a, _b, _c;
                const name = e2e_util_1.generateRandomString(5);
                const body = { name };
                const headers = { Authorization: `Bearer ${accessToken}` };
                try {
                    await axios_1.default.post(`${baseUrl}/users/test/teams`, body, { headers });
                    fail("Expected an error");
                }
                catch (error) {
                    expect((_a = error.response) === null || _a === void 0 ? void 0 : _a.status).toBe(400);
                    expect((_b = error.response) === null || _b === void 0 ? void 0 : _b.statusText).toBe("Bad Request");
                    expect((_c = error.response) === null || _c === void 0 ? void 0 : _c.data).toEqual({
                        message: "Error validating request",
                        validationErrors: { pathParameters: { userId: "Failed constraint check for string: Must be a user id" } },
                    });
                }
            });
        });
        fdescribe("when passed an invalid body", () => {
            it("throws a 400 error with a valid structure", async () => {
                var _a, _b, _c;
                const body = {};
                const headers = { Authorization: `Bearer ${accessToken}` };
                try {
                    await axios_1.default.post(`${baseUrl}/users/${user.id}/teams`, body, { headers });
                    fail("Expected an error");
                }
                catch (error) {
                    expect((_a = error.response) === null || _a === void 0 ? void 0 : _a.status).toBe(400);
                    expect((_b = error.response) === null || _b === void 0 ? void 0 : _b.statusText).toBe("Bad Request");
                    expect((_c = error.response) === null || _c === void 0 ? void 0 : _c.data).toEqual({
                        message: "Error validating request",
                        validationErrors: { body: { name: "Expected string, but was missing" } },
                    });
                }
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlVGVhbS5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vZTJlL2NyZWF0ZVRlYW0uc3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLCtEQUErRDtBQUMvRCxzREFBOEI7QUFDOUIsa0RBQTBDO0FBQzFDLG9DQUFpQztBQUNqQywrREFBaUk7QUFFakksa0VBQTBEO0FBRzFELFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFDM0MsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFxQixDQUFDO0lBQ3RELE1BQU0sT0FBTyxHQUFHLFdBQVcsV0FBVyw2QkFBNkIsQ0FBQztJQUVwRSxJQUFJLElBQVUsQ0FBQztJQUNmLElBQUksV0FBbUIsQ0FBQztJQUV4QixTQUFTLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDbEIsaUJBQWUsQ0FBQyx3QkFBd0IsR0FBRyxLQUFLLENBQUM7UUFFbEQsSUFBSSxHQUFHLE1BQU0sMkJBQWdCLEVBQVUsQ0FBQztRQUV4QyxDQUFDLEVBQUUsV0FBVyxFQUFFLEdBQUcsTUFBTSxnQ0FBcUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7UUFDdkMsRUFBRSxDQUFDLDBCQUEwQixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3hDLE1BQU0sSUFBSSxHQUFHLCtCQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUM7WUFDdEIsTUFBTSxPQUFPLEdBQUcsRUFBRSxhQUFhLEVBQUUsVUFBVSxXQUFXLEVBQUUsRUFBRSxDQUFDO1lBRTNELElBQUk7Z0JBQ0YsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLGVBQUssQ0FBQyxJQUFJLENBQWtC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IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2VzcyAqL1xuaW1wb3J0IGphc21pbmUgZnJvbSBcImphc21pbmVcIjtcbmltcG9ydCBheGlvcywgeyBBeGlvc0Vycm9yIH0gZnJvbSBcImF4aW9zXCI7XG5pbXBvcnQgeyBSb2xlIH0gZnJvbSBcIkB5YWMvY29yZVwiO1xuaW1wb3J0IHsgY3JlYXRlUmFuZG9tVXNlciwgZ2V0QWNjZXNzVG9rZW5CeUVtYWlsLCBnZW5lcmF0ZVJhbmRvbVN0cmluZywgZG9jdW1lbnRDbGllbnQgfSBmcm9tIFwiLi4vLi4vLi4vY29uZmlnL2phc21pbmUvZTJlLnV0aWxcIjtcbmltcG9ydCB7IFRlYW0gfSBmcm9tIFwiLi4vc3JjL21lZGlhdG9yLXNlcnZpY2VzL3RlYW0ubWVkaWF0b3Iuc2VydmljZVwiO1xuaW1wb3J0IHsgRW50aXR5VHlwZSB9IGZyb20gXCIuLi9zcmMvZW51bXMvZW50aXR5VHlwZS5lbnVtXCI7XG5pbXBvcnQgeyBVc2VyIH0gZnJvbSBcIi4uL3NyYy9tZWRpYXRvci1zZXJ2aWNlcy91c2VyLm1lZGlhdG9yLnNlcnZpY2VcIjtcblxuZGVzY3JpYmUoXCJQT1NUIC91c2Vycy97dXNlci5pZH0vdGVhbXNcIiwgKCkgPT4ge1xuICBjb25zdCBlbnZpcm9ubWVudCA9IHByb2Nlc3MuZW52LmVudmlyb25tZW50IGFzIHN0cmluZztcbiAgY29uc3QgYmFzZVVybCA9IGBodHRwczovLyR7ZW52aXJvbm1lbnR9LnlhY2NoYXQuY29tL2VudGl0eS1zZXJ2aWNlYDtcblxuICBsZXQgdXNlcjogVXNlcjtcbiAgbGV0IGFjY2Vzc1Rva2VuOiBzdHJpbmc7XG5cbiAgYmVmb3JlQWxsKGFzeW5jICgpID0+IHtcbiAgICAoamFzbWluZSBhcyBhbnkpLkRFRkFVTFRfVElNRU9VVF9JTlRFUlZBTCA9IDE1MDAwO1xuXG4gICAgdXNlciA9IGF3YWl0IGNyZWF0ZVJhbmRvbVVzZXIoKSBhcyBVc2VyO1xuXG4gICAgKHsgYWNjZXNzVG9rZW4gfSA9IGF3YWl0IGdldEFjY2Vzc1Rva2VuQnlFbWFpbCh1c2VyLmVtYWlsKSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKFwidW5kZXIgbm9ybWFsIGNvbmRpdGlvbnNcIiwgKCkgPT4ge1xuICAgIGl0KFwicmV0dXJucyBhIHZhbGlkIHJlc3BvbnNlXCIsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSBnZW5lcmF0ZVJhbmRvbVN0cmluZyg1KTtcbiAgICAgIGNvbnN0IGJvZHkgPSB7IG5hbWUgfTtcbiAgICAgIGNvbnN0IGhlYWRlcnMgPSB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHthY2Nlc3NUb2tlbn1gIH07XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHsgc3RhdHVzLCBkYXRhIH0gPSBhd2FpdCBheGlvcy5wb3N0PHsgdGVhbTogVGVhbTsgfT4oYCR7YmFzZVVybH0vdXNlcnMvJHt1c2VyLmlkfS90ZWFtc2AsIGJvZHksIHsgaGVhZGVycyB9KTtcblxuICAgICAgICBleHBlY3Qoc3RhdHVzKS50b0JlKDIwMSk7XG4gICAgICAgIGV4cGVjdChkYXRhLnRlYW0pLnRvQmVEZWZpbmVkKCk7XG4gICAgICAgIGV4cGVjdChkYXRhLnRlYW0uaWQpLnRvTWF0Y2goL3RlYW0tLiovKTtcbiAgICAgICAgZXhwZWN0KGRhdGEudGVhbS5uYW1lKS50b0JlKG5hbWUpO1xuICAgICAgICBleHBlY3QoZGF0YS50ZWFtLmNyZWF0ZWRCeSkudG9CZSh1c2VyLmlkKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGZhaWwoZXJyb3IpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaXQoXCJjcmVhdGVzIGEgdmFsaWQgVGVhbSBlbnRpdHlcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IGdlbmVyYXRlUmFuZG9tU3RyaW5nKDUpO1xuICAgICAgY29uc3QgYm9keSA9IHsgbmFtZSB9O1xuICAgICAgY29uc3QgaGVhZGVycyA9IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2FjY2Vzc1Rva2VufWAgfTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBheGlvcy5wb3N0PHsgdGVhbTogVGVhbTsgfT4oYCR7YmFzZVVybH0vdXNlcnMvJHt1c2VyLmlkfS90ZWFtc2AsIGJvZHksIHsgaGVhZGVycyB9KTtcblxuICAgICAgICBjb25zdCBnZXRUZWFtUmVzcG9uc2UgPSBhd2FpdCBkb2N1bWVudENsaWVudC5nZXQoe1xuICAgICAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnZbXCJjb3JlLXRhYmxlLW5hbWVcIl0gYXMgc3RyaW5nLFxuICAgICAgICAgIEtleTogeyBwazogZGF0YS50ZWFtLmlkLCBzazogZGF0YS50ZWFtLmlkIH0sXG4gICAgICAgIH0pLnByb21pc2UoKTtcblxuICAgICAgICBjb25zdCB0ZWFtID0gZ2V0VGVhbVJlc3BvbnNlLkl0ZW0gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG5cbiAgICAgICAgZXhwZWN0KHRlYW0pLnRvQmVEZWZpbmVkKCk7XG4gICAgICAgIGV4cGVjdCh0ZWFtLmVudGl0eVR5cGUpLnRvQmUoRW50aXR5VHlwZS5UZWFtKTtcbiAgICAgICAgZXhwZWN0KHRlYW0ucGspLnRvQmUoZGF0YS50ZWFtLmlkKTtcbiAgICAgICAgZXhwZWN0KHRlYW0uc2spLnRvQmUoZGF0YS50ZWFtLmlkKTtcbiAgICAgICAgZXhwZWN0KHRlYW0uaWQpLnRvQmUoZGF0YS50ZWFtLmlkKTtcbiAgICAgICAgZXhwZWN0KHRlYW0ubmFtZSkudG9CZShuYW1lKTtcbiAgICAgICAgZXhwZWN0KHRlYW0uY3JlYXRlZEJ5KS50b0JlKHVzZXIuaWQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgZmFpbChlcnJvcik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpdChcImNyZWF0ZXMgYSB2YWxpZCBUZWFtVXNlclJlbGF0aW9uc2hpcCBlbnRpdHlcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IGdlbmVyYXRlUmFuZG9tU3RyaW5nKDUpO1xuICAgICAgY29uc3QgYm9keSA9IHsgbmFtZSB9O1xuICAgICAgY29uc3QgaGVhZGVycyA9IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2FjY2Vzc1Rva2VufWAgfTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBheGlvcy5wb3N0PHsgdGVhbTogVGVhbTsgfT4oYCR7YmFzZVVybH0vdXNlcnMvJHt1c2VyLmlkfS90ZWFtc2AsIGJvZHksIHsgaGVhZGVycyB9KTtcblxuICAgICAgICBjb25zdCBnZXRUZWFtVXNlclJlbGF0aW9uc2hpcFJlc3BvbnNlID0gYXdhaXQgZG9jdW1lbnRDbGllbnQuZ2V0KHtcbiAgICAgICAgICBUYWJsZU5hbWU6IHByb2Nlc3MuZW52W1wiY29yZS10YWJsZS1uYW1lXCJdIGFzIHN0cmluZyxcbiAgICAgICAgICBLZXk6IHsgcGs6IGRhdGEudGVhbS5pZCwgc2s6IHVzZXIuaWQgfSxcbiAgICAgICAgfSkucHJvbWlzZSgpO1xuXG4gICAgICAgIGNvbnN0IHRlYW1Vc2VyUmVsYXRpb25zaGlwID0gZ2V0VGVhbVVzZXJSZWxhdGlvbnNoaXBSZXNwb25zZS5JdGVtIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG4gICAgICAgIGV4cGVjdCh0ZWFtVXNlclJlbGF0aW9uc2hpcCkudG9CZURlZmluZWQoKTtcbiAgICAgICAgZXhwZWN0KHRlYW1Vc2VyUmVsYXRpb25zaGlwLmVudGl0eVR5cGUpLnRvQmUoRW50aXR5VHlwZS5UZWFtVXNlclJlbGF0aW9uc2hpcCk7XG4gICAgICAgIGV4cGVjdCh0ZWFtVXNlclJlbGF0aW9uc2hpcC5waykudG9CZShkYXRhLnRlYW0uaWQpO1xuICAgICAgICBleHBlY3QodGVhbVVzZXJSZWxhdGlvbnNoaXAuc2spLnRvQmUodXNlci5pZCk7XG4gICAgICAgIGV4cGVjdCh0ZWFtVXNlclJlbGF0aW9uc2hpcC5nc2kxcGspLnRvQmUodXNlci5pZCk7XG4gICAgICAgIGV4cGVjdCh0ZWFtVXNlclJlbGF0aW9uc2hpcC5nc2kxc2spLnRvQmUoZGF0YS50ZWFtLmlkKTtcbiAgICAgICAgZXhwZWN0KHRlYW1Vc2VyUmVsYXRpb25zaGlwLnRlYW1JZCkudG9CZShkYXRhLnRlYW0uaWQpO1xuICAgICAgICBleHBlY3QodGVhbVVzZXJSZWxhdGlvbnNoaXAudXNlcklkKS50b0JlKHVzZXIuaWQpO1xuICAgICAgICBleHBlY3QodGVhbVVzZXJSZWxhdGlvbnNoaXAucm9sZSkudG9CZShSb2xlLkFkbWluKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGZhaWwoZXJyb3IpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZShcInVuZGVyIGVycm9yIGNvbmRpdGlvbnNcIiwgKCkgPT4ge1xuICAgIGRlc2NyaWJlKFwid2hlbiBhbiBhY2Nlc3MgdG9rZW4gaXMgbm90IHBhc3NlZCBpbiB0aGUgaGVhZGVyc1wiLCAoKSA9PiB7XG4gICAgICBpdChcInRocm93cyBhIDQwMSBlcnJvclwiLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBnZW5lcmF0ZVJhbmRvbVN0cmluZyg1KTtcbiAgICAgICAgY29uc3QgYm9keSA9IHsgbmFtZSB9O1xuICAgICAgICBjb25zdCBoZWFkZXJzID0ge307XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCBheGlvcy5wb3N0KGAke2Jhc2VVcmx9L3VzZXJzLyR7dXNlci5pZH0vdGVhbXNgLCBib2R5LCB7IGhlYWRlcnMgfSk7XG5cbiAgICAgICAgICBmYWlsKFwiRXhwZWN0ZWQgYW4gZXJyb3JcIik7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgICAgY29uc3QgYXhpb3NFcnJvciA9IGVycm9yIGFzIEF4aW9zRXJyb3I7XG5cbiAgICAgICAgICBleHBlY3QoYXhpb3NFcnJvci5yZXNwb25zZT8uc3RhdHVzKS50b0JlKDQwMSk7XG4gICAgICAgICAgZXhwZWN0KGF4aW9zRXJyb3IucmVzcG9uc2U/LnN0YXR1c1RleHQpLnRvQmUoXCJVbmF1dGhvcml6ZWRcIik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZmRlc2NyaWJlKFwid2hlbiBwYXNzZWQgYW4gaW52YWxpZCB1c2VySWQgaW4gdGhlIHBhdGhcIiwgKCkgPT4ge1xuICAgICAgaXQoXCJ0aHJvd3MgYSA0MDAgZXJyb3Igd2l0aCBhIHZhbGlkIHN0cnVjdHVyZVwiLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBnZW5lcmF0ZVJhbmRvbVN0cmluZyg1KTtcbiAgICAgICAgY29uc3QgYm9keSA9IHsgbmFtZSB9O1xuICAgICAgICBjb25zdCBoZWFkZXJzID0geyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7YWNjZXNzVG9rZW59YCB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgYXhpb3MucG9zdChgJHtiYXNlVXJsfS91c2Vycy90ZXN0L3RlYW1zYCwgYm9keSwgeyBoZWFkZXJzIH0pO1xuXG4gICAgICAgICAgZmFpbChcIkV4cGVjdGVkIGFuIGVycm9yXCIpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGV4cGVjdChlcnJvci5yZXNwb25zZT8uc3RhdHVzKS50b0JlKDQwMCk7XG4gICAgICAgICAgZXhwZWN0KGVycm9yLnJlc3BvbnNlPy5zdGF0dXNUZXh0KS50b0JlKFwiQmFkIFJlcXVlc3RcIik7XG4gICAgICAgICAgZXhwZWN0KGVycm9yLnJlc3BvbnNlPy5kYXRhKS50b0VxdWFsKHtcbiAgICAgICAgICAgIG1lc3NhZ2U6IFwiRXJyb3IgdmFsaWRhdGluZyByZXF1ZXN0XCIsXG4gICAgICAgICAgICB2YWxpZGF0aW9uRXJyb3JzOiB7IHBhdGhQYXJhbWV0ZXJzOiB7IHVzZXJJZDogXCJGYWlsZWQgY29uc3RyYWludCBjaGVjayBmb3Igc3RyaW5nOiBNdXN0IGJlIGEgdXNlciBpZFwiIH0gfSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZGVzY3JpYmUoXCJ3aGVuIHBhc3NlZCBhbiBpbnZhbGlkIGJvZHlcIiwgKCkgPT4ge1xuICAgICAgaXQoXCJ0aHJvd3MgYSA0MDAgZXJyb3Igd2l0aCBhIHZhbGlkIHN0cnVjdHVyZVwiLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGJvZHkgPSB7fTtcbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2FjY2Vzc1Rva2VufWAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IGF4aW9zLnBvc3QoYCR7YmFzZVVybH0vdXNlcnMvJHt1c2VyLmlkfS90ZWFtc2AsIGJvZHksIHsgaGVhZGVycyB9KTtcblxuICAgICAgICAgIGZhaWwoXCJFeHBlY3RlZCBhbiBlcnJvclwiKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBleHBlY3QoZXJyb3IucmVzcG9uc2U/LnN0YXR1cykudG9CZSg0MDApO1xuICAgICAgICAgIGV4cGVjdChlcnJvci5yZXNwb25zZT8uc3RhdHVzVGV4dCkudG9CZShcIkJhZCBSZXF1ZXN0XCIpO1xuICAgICAgICAgIGV4cGVjdChlcnJvci5yZXNwb25zZT8uZGF0YSkudG9FcXVhbCh7XG4gICAgICAgICAgICBtZXNzYWdlOiBcIkVycm9yIHZhbGlkYXRpbmcgcmVxdWVzdFwiLFxuICAgICAgICAgICAgdmFsaWRhdGlvbkVycm9yczogeyBib2R5OiB7IG5hbWU6IFwiRXhwZWN0ZWQgc3RyaW5nLCBidXQgd2FzIG1pc3NpbmdcIiB9IH0sXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19