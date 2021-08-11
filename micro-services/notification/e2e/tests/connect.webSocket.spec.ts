/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import WebSocket from "ws";
import { createRandomCognitoUser, getAccessTokenByEmail } from "../../../../e2e/util";
import { getListenerMappingsByUserIdAndType } from "../util";
import { ListenerType } from "../../src/enums/listenerType.enum";
import { EntityType } from "../../src/enums/entityType.enum";

describe("WebSocket connect", () => {
  const webSocketUrl = process.env.webSocketUrl as string;
  let userId: string;
  let accessToken: string;

  beforeAll(async () => {
    // Create user in cognito
    const { email, id } = await createRandomCognitoUser();
    userId = id;

    // Get JWT token
    ({ accessToken } = await getAccessTokenByEmail(email));
  });

  describe("under normal conditions", () => {
    it("inserts a record into the ListenerMapping table", async () => {
      // Establish connection
      const connection = new WebSocket(`${webSocketUrl}?token=${accessToken}`);

      // Wait for it to successfully connect
      await new Promise((resolve, reject) => {
        connection.on("error", (error) => reject(error));
        connection.on("open", (event: unknown) => resolve(event));
      });

      const { listenerMappings } = await getListenerMappingsByUserIdAndType({ userId, type: ListenerType.WebSocket });

      // Assert that the listener mapping record was created
      expect(listenerMappings.length).toBe(1);
      expect(listenerMappings[0]).toEqual({
        entityType: EntityType.ListenerMapping,
        pk: userId,
        sk: jasmine.stringMatching(new RegExp(`${ListenerType.WebSocket}-.*`)),
        gsi1pk: jasmine.stringMatching(new RegExp(`${ListenerType.WebSocket}-.*`)),
        gsi1sk: userId,
        type: ListenerType.WebSocket,
        value: jasmine.any(String),
        userId,
      });
    });
  });

  describe("under error conditions", () => {
    describe("when a token is not passed", () => {
      it("doesn't connect", async () => {
        const connection = new WebSocket(webSocketUrl);

        try {
          await new Promise((resolve, reject) => {
            connection.on("error", (error) => reject(error));
            connection.on("open", (event: unknown) => resolve(event));
          });

          fail("expected failure");
        } catch (error) {}
      });
    });

    describe("when an invalid token is passed", () => {
      it("doesn't connect", async () => {
        const connection = new WebSocket(`${webSocketUrl}?token=test-token`);

        try {
          await new Promise((resolve, reject) => {
            connection.on("error", (error) => reject(error));
            connection.on("open", (event: unknown) => resolve(event));
          });

          fail("expected failure");
        } catch (error) {}
      });
    });
  });
});
