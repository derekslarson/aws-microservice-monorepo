"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("jasmine");
const axios_1 = __importDefault(require("axios"));
const e2e_util_1 = require("../../../config/jasmine/e2e.util");
describe("POST /users/{userId}/teams", () => {
    const environment = process.env.environment;
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
            const name = e2e_util_1.generateRandomString(5);
            const body = { name };
            const headers = { Authorization: `Bearer ${jwt}` };
            try {
                const { data } = await axios_1.default.post(`https://${environment}.yacchat.com/entity-service/users/${userId}/teams`, body, { headers });
                console.log(data);
                expect(data.team).toBeDefined();
                expect(data.team.id).toMatch(/team-.*/);
                expect(data.team.name).toBe(name);
                expect(data.team.createdBy).toBe(userId);
            }
            catch (error) {
                fail(error);
            }
        }, 15000);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlVGVhbS5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vZTJlL2NyZWF0ZVRlYW0uc3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLG1CQUFpQjtBQUNqQixrREFBMEI7QUFDMUIsK0RBQWlIO0FBSWpILFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7SUFDMUMsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFxQixDQUFDO0lBQ3RELElBQUksR0FBVyxDQUFDO0lBQ2hCLElBQUksTUFBYyxDQUFDO0lBRW5CLFNBQVMsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNuQixNQUFNLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLE1BQU0sMkJBQWdCLEVBQUUsQ0FBQztRQUMvQyxNQUFNLEdBQUcsRUFBWSxDQUFDO1FBRXRCLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxNQUFNLGdDQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNELEdBQUcsR0FBRyxXQUFXLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLEVBQUUsQ0FBQyw4QkFBOEIsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1QyxNQUFNLElBQUksR0FBRywrQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyQyxNQUFNLElBQUksR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDO1lBQ3RCLE1BQU0sT0FBTyxHQUFHLEVBQUUsYUFBYSxFQUFFLFVBQVUsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUVuRCxJQUFJO2dCQUNGLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLGVBQUssQ0FBQyxJQUFJLENBQWtCLFdBQVcsV0FBVyxxQ0FBcUMsTUFBTSxRQUFRLEVBQUUsSUFBSSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFFakosT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFbEIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUN4QyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2xDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUMxQztZQUFDLE9BQU8sS0FBSyxFQUFFO2dCQUNkLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNiO1FBQ0gsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ1osQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBcImphc21pbmVcIjtcbmltcG9ydCBheGlvcyBmcm9tIFwiYXhpb3NcIjtcbmltcG9ydCB7IGNyZWF0ZVJhbmRvbVVzZXIsIGdldEFjY2Vzc1Rva2VuQnlFbWFpbCwgZ2VuZXJhdGVSYW5kb21TdHJpbmcgfSBmcm9tIFwiLi4vLi4vLi4vY29uZmlnL2phc21pbmUvZTJlLnV0aWxcIjtcbmltcG9ydCB7IFRlYW0gfSBmcm9tIFwiLi4vc3JjL21lZGlhdG9yLXNlcnZpY2VzL3RlYW0ubWVkaWF0b3Iuc2VydmljZVwiO1xuaW1wb3J0IHsgVXNlcklkIH0gZnJvbSBcIi4uL3NyYy90eXBlcy91c2VySWQudHlwZVwiO1xuXG5kZXNjcmliZShcIlBPU1QgL3VzZXJzL3t1c2VySWR9L3RlYW1zXCIsICgpID0+IHtcbiAgY29uc3QgZW52aXJvbm1lbnQgPSBwcm9jZXNzLmVudi5lbnZpcm9ubWVudCBhcyBzdHJpbmc7XG4gIGxldCBqd3Q6IHN0cmluZztcbiAgbGV0IHVzZXJJZDogVXNlcklkO1xuXG4gIGJlZm9yZUFsbChhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgeyBpZCwgZW1haWwgfSA9IGF3YWl0IGNyZWF0ZVJhbmRvbVVzZXIoKTtcbiAgICB1c2VySWQgPSBpZCBhcyBVc2VySWQ7XG5cbiAgICBjb25zdCB7IGFjY2Vzc1Rva2VuIH0gPSBhd2FpdCBnZXRBY2Nlc3NUb2tlbkJ5RW1haWwoZW1haWwpO1xuICAgIGp3dCA9IGFjY2Vzc1Rva2VuO1xuICB9KTtcblxuICBkZXNjcmliZShcInVuZGVyIG5vcm1hbCBjb25kaXRpb25zXCIsICgpID0+IHtcbiAgICBpdChcInJldHVybnMgdGhlIHByb3BlciBzdHJ1Y3R1cmVcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IGdlbmVyYXRlUmFuZG9tU3RyaW5nKDUpO1xuICAgICAgY29uc3QgYm9keSA9IHsgbmFtZSB9O1xuICAgICAgY29uc3QgaGVhZGVycyA9IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2p3dH1gIH07XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgYXhpb3MucG9zdDx7IHRlYW06IFRlYW07IH0+KGBodHRwczovLyR7ZW52aXJvbm1lbnR9LnlhY2NoYXQuY29tL2VudGl0eS1zZXJ2aWNlL3VzZXJzLyR7dXNlcklkfS90ZWFtc2AsIGJvZHksIHsgaGVhZGVycyB9KTtcblxuICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcblxuICAgICAgICBleHBlY3QoZGF0YS50ZWFtKS50b0JlRGVmaW5lZCgpO1xuICAgICAgICBleHBlY3QoZGF0YS50ZWFtLmlkKS50b01hdGNoKC90ZWFtLS4qLyk7XG4gICAgICAgIGV4cGVjdChkYXRhLnRlYW0ubmFtZSkudG9CZShuYW1lKTtcbiAgICAgICAgZXhwZWN0KGRhdGEudGVhbS5jcmVhdGVkQnkpLnRvQmUodXNlcklkKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGZhaWwoZXJyb3IpO1xuICAgICAgfVxuICAgIH0sIDE1MDAwKTtcbiAgfSk7XG59KTtcbiJdfQ==