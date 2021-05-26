import { fail } from "assert";
import { Spied, TestSupport, LoggerService, HttpRequestService } from "@yac/core";

import { EnvConfigInterface } from "../../config/env.config";
import { YacLegacyApiService } from "../yacLegacyApi.service";

const envConfig: Pick<EnvConfigInterface, "yacApiUrl"> = { yacApiUrl: "yac_api" };
let loggerService: Spied<LoggerService>;
let httpService: Spied<HttpRequestService>;
let yacLegacyApiService: YacLegacyApiService;

const mockYacMessageId = "123";
const mockYacToken = "yac-token--123123";
const mockYacMessage = {
  id: mockYacMessageId,
  is: "this is a yac message",
};
const mockYacUser = {
  id: 123,
  name: "John Doe",
  username: "username",
  image: "image",
};

describe("YacLegacyApiService", () => {
  beforeEach(() => {
    // declare the service to test
    loggerService = TestSupport.spyOnClass(LoggerService);
    httpService = TestSupport.spyOnClass(HttpRequestService);
    yacLegacyApiService = new YacLegacyApiService(loggerService, envConfig, httpService);
  });

  describe("getMessage", () => {
    describe("fails correctly", () => {
      it("fails when HttpService fails", async () => {
        httpService.get.and.throwError("Failed on HttpService");

        try {
          await yacLegacyApiService.getMessage(mockYacMessageId, true, mockYacToken);

          fail("Should not have gone thru");
        } catch (error: unknown) {
          expect(httpService.get).toHaveBeenCalledWith(`${envConfig.yacApiUrl}/v2/messages/${mockYacMessageId}`, { isGroupMessage: "true" }, { Authorization: mockYacToken });
        }
      });
    });

    describe("success correctly", () => {
      it("correctly queries the Yac Api", async () => {
        httpService.get.and.returnValue({ body: mockYacMessage });

        try {
          const response = await yacLegacyApiService.getMessage(mockYacMessageId, true, mockYacToken);

          expect(httpService.get).toHaveBeenCalledWith(`${envConfig.yacApiUrl}/v2/messages/${mockYacMessageId}`, { isGroupMessage: "true" }, { Authorization: mockYacToken });
          expect(response).toBeDefined();
          expect(response).toEqual(mockYacMessage);
        } catch (error: unknown) {
          fail("Should not have failed");
        }
      });
    });
  });

  describe("getUserImageAndNameWithId", () => {
    describe("fails correctly", () => {
      it("fails when HttpService fails", async () => {
        httpService.get.and.throwError("Failed on HttpService");

        try {
          await yacLegacyApiService.getUserImageAndNameWithId(mockYacUser.id);

          fail("Should not have gone thru");
        } catch (error: unknown) {
          expect(httpService.get).toHaveBeenCalledWith(`${envConfig.yacApiUrl}/v2/users/undefined/image-and-name`, { userId: String(mockYacUser.id) });
        }
      });

      describe("success correctly", () => {
        it("correctly queries the Yac Api", async () => {
          httpService.get.and.returnValue({ body: mockYacUser });

          try {
            const response = await yacLegacyApiService.getUserImageAndNameWithId(mockYacUser.id);

            expect(httpService.get).toHaveBeenCalledWith(`${envConfig.yacApiUrl}/v2/users/undefined/image-and-name`, { userId: String(mockYacUser.id) });
            expect(response).toBeDefined();
            expect(response).toEqual(mockYacUser);
          } catch (error: unknown) {
            fail("Should not have failed");
          }
        });
      });
    });
  });
});
