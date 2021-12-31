/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import WebSocket from "ws";
import { backoff, createRandomAuthServiceUser, getAccessTokenByEmail } from "../../../../e2e/util";
import { getListenerMappingsByUserIdAndType } from "../util";
import { ListenerType } from "../../src/enums/listenerType.enum";

describe("WebSocket disconnect", () => {
  const webSocketUrl = process.env.webSocketUrl as string;
  let userId: string;
  let accessToken: string;
  let connection: WebSocket;

  beforeAll(async () => {
    // Create user in cognito
    const { email, id } = await createRandomAuthServiceUser();
    userId = id;

    // Get JWT token
    ({ accessToken } = await getAccessTokenByEmail(email));
  });

  beforeEach(async () => {
    // Establish connection
    connection = new WebSocket(`${webSocketUrl}?token=${accessToken}`);

    // Wait for it to successfully connect
    await new Promise((resolve, reject) => {
      connection.on("error", (error) => reject(error));
      connection.on("open", (event: unknown) => resolve(event));
    });
  });

  describe("under normal conditions", () => {
    it("removes the record from the ListenerMapping table", async () => {
      connection.close();

      const { listenerMappings } = await backoff(
        () => getListenerMappingsByUserIdAndType({ userId, type: ListenerType.WebSocket }),
        (response) => response.listenerMappings.length === 0,
      );

      // Assert that the listener mapping record no longer exists
      expect(listenerMappings.length).toBe(0);
    });
  });
});
