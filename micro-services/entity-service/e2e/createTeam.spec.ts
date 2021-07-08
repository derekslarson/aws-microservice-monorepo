import "jasmine";
import axios from "axios";
import { createRandomUser, getAccessTokenByEmail, generateRandomString } from "../../../config/jasmine/e2e.util";
import { Team } from "../src/mediator-services/team.mediator.service";
import { UserId } from "../src/types/userId.type";

describe("POST /users/{userId}/teams", () => {
  const environment = process.env.environment as string;
  let jwt: string;
  let userId: UserId;

  beforeAll(async () => {
    const { id, email } = await createRandomUser();
    userId = id as UserId;

    const { accessToken } = await getAccessTokenByEmail(email);
    jwt = accessToken;
  });

  describe("under normal conditions", () => {
    it("returns the proper structure", async () => {
      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${jwt}` };

      try {
        const { data } = await axios.post<{ team: Team; }>(`https://${environment}.yacchat.com/entity-service/users/${userId}/teams`, body, { headers });

        expect(data.team).toBeDefined();
        expect(data.team.id).toMatch(/team-.*/);
        expect(data.team.name).toBe(name);
        expect(data.team.createdBy).toBe(userId);
      } catch (error) {
        fail(error);
      }
    }, 15000);
  });
});
