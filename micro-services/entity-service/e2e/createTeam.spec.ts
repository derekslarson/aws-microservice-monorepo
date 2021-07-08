import "jasmine";
import axios from "axios";
import { createRandomUser, getAccessTokenByEmail } from "../../../config/jasmine/e2e.util";

describe("POST /users/{userId}/teams", () => {
  let jwt: string;
  let userId: string;

  beforeAll(async () => {
    const { id, email } = await createRandomUser();
    userId = id;

    const { accessToken } = await getAccessTokenByEmail(email);
    jwt = accessToken;
  });

  describe("under normal conditions", () => {
    it("returns the proper structure", async () => {
      console.log({ jwt, userId });
      const response = await axios.post(`https://dereklarson.yacchat.com/entity-service/users/${userId}/teams`, {}, { headers: { authorization: `Bearer ${jwt}` } });

      console.log(response);
    });
  });
});
