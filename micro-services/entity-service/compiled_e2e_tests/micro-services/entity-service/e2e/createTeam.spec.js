"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("jasmine");
const axios_1 = __importDefault(require("axios"));
const e2e_util_1 = require("../../../config/jasmine/e2e.util");
describe("POST /users/{userId}/teams", () => {
    let jwt;
    let userId;
    beforeAll(async () => {
        const { id, email } = await e2e_util_1.createRandomUser();
        userId = id;
        const { accessToken } = await e2e_util_1.getAccessTokenByEmail(email);
        jwt = accessToken;
    });
    describe("under normal conditions", () => {
        it("returns the proper structure", async () => {
            console.log({ jwt, userId });
            const response = await axios_1.default.post(`https://dereklarson.yacchat.com/entity-service/users/${userId}/teams`, {}, { headers: { authorization: `Bearer ${jwt}` } });
            console.log(response);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlVGVhbS5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vZTJlL2NyZWF0ZVRlYW0uc3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLG1CQUFpQjtBQUNqQixrREFBMEI7QUFDMUIsK0RBQTJGO0FBRTNGLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7SUFDMUMsSUFBSSxHQUFXLENBQUM7SUFDaEIsSUFBSSxNQUFjLENBQUM7SUFFbkIsU0FBUyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ25CLE1BQU0sRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsTUFBTSwyQkFBZ0IsRUFBRSxDQUFDO1FBQy9DLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFFWixNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsTUFBTSxnQ0FBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzRCxHQUFHLEdBQUcsV0FBVyxDQUFDO0lBQ3BCLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtRQUN2QyxFQUFFLENBQUMsOEJBQThCLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQzdCLE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBSyxDQUFDLElBQUksQ0FBQyx3REFBd0QsTUFBTSxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsYUFBYSxFQUFFLFVBQVUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFFL0osT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgXCJqYXNtaW5lXCI7XG5pbXBvcnQgYXhpb3MgZnJvbSBcImF4aW9zXCI7XG5pbXBvcnQgeyBjcmVhdGVSYW5kb21Vc2VyLCBnZXRBY2Nlc3NUb2tlbkJ5RW1haWwgfSBmcm9tIFwiLi4vLi4vLi4vY29uZmlnL2phc21pbmUvZTJlLnV0aWxcIjtcblxuZGVzY3JpYmUoXCJQT1NUIC91c2Vycy97dXNlcklkfS90ZWFtc1wiLCAoKSA9PiB7XG4gIGxldCBqd3Q6IHN0cmluZztcbiAgbGV0IHVzZXJJZDogc3RyaW5nO1xuXG4gIGJlZm9yZUFsbChhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgeyBpZCwgZW1haWwgfSA9IGF3YWl0IGNyZWF0ZVJhbmRvbVVzZXIoKTtcbiAgICB1c2VySWQgPSBpZDtcblxuICAgIGNvbnN0IHsgYWNjZXNzVG9rZW4gfSA9IGF3YWl0IGdldEFjY2Vzc1Rva2VuQnlFbWFpbChlbWFpbCk7XG4gICAgand0ID0gYWNjZXNzVG9rZW47XG4gIH0pO1xuXG4gIGRlc2NyaWJlKFwidW5kZXIgbm9ybWFsIGNvbmRpdGlvbnNcIiwgKCkgPT4ge1xuICAgIGl0KFwicmV0dXJucyB0aGUgcHJvcGVyIHN0cnVjdHVyZVwiLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyh7IGp3dCwgdXNlcklkIH0pO1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcy5wb3N0KGBodHRwczovL2RlcmVrbGFyc29uLnlhY2NoYXQuY29tL2VudGl0eS1zZXJ2aWNlL3VzZXJzLyR7dXNlcklkfS90ZWFtc2AsIHt9LCB7IGhlYWRlcnM6IHsgYXV0aG9yaXphdGlvbjogYEJlYXJlciAke2p3dH1gIH0gfSk7XG5cbiAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTtcbiAgICB9KTtcbiAgfSk7XG59KTtcbiJdfQ==