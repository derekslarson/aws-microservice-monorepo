import { fail } from "assert";
import { Spied, TestSupport, LoggerService, HttpRequestService } from "@yac/core";
import { Task, BannerbearService, BannerbearServiceInterface } from "../bannerbear.service";
import { EnvConfigInterface } from "../../config/env.config";

let bannerbearService: BannerbearServiceInterface;
let loggerService: Spied<LoggerService>;
let httpService: Spied<HttpRequestService>;
const envConfig: Pick<EnvConfigInterface, "origin" | "bannerbear_key" | "bannerbear_templates"> = {
  bannerbear_key: "TEST_123_23",
  origin: "wtf.com",
  bannerbear_templates: {
    GIF2VIDEO: "abc-def12",
    IMAGE: "fge-456",
  },
};
const mockBannerbearResourceId = "bannerbear-ID-123123";
const mockUserResourceId = "USER-1234";
// const mockGroupResourceId = "GROUP-1234";
const mockBannerbearResponseWithoutImage = {
  created_at: "123",
  uid: mockBannerbearResourceId,
  status: "in_progress",
  input_media_url: "image.com",
};
const mockBannerbearResponseWithImage = {
  ...mockBannerbearResponseWithoutImage,
  image_url: "another-image.com",
};
const mockImageTask: () => Task<"IMAGE"> = () => ({
  type: "IMAGE",
  options: {
    templateParameters: {
      username: "@atest",
      user_image: "image.com",
      channel: "#channel-name",
      subject: "Test subject",
    },
  },
});

const mockGif2VideoTask: () => Task<"GIF2VIDEO"> = () => ({
  type: "GIF2VIDEO",
  options: {
    source: "yac.com/image",
    templateParameters: {
      username: "@atest",
      channel: "#channel-name",
      subject: "Test subject",
    },
  },
});

const mockModifications = [ {
  name: "username",
  text: "@atest",
}, {
  name: "channel",
  text: "#channel-name",
}, {
  name: "subject",
  text: "Test subject",
}, {
  name: "user_image",
  image_url: "image.com",
} ];

const mockIncompleteRequestModifications = [ {
  name: "username",
  text: "@atest",
}, {
  name: "user_image",
  image_url: "image.com",
} ];

const mockImageRequestDataFactory = (type: "IMAGE" | "GIF2VIDEO", modifications: Array<unknown>) => ({
  template: envConfig.bannerbear_templates[type],
  modifications,
  webhook_url: `${envConfig.origin}/bannerbear/callback`,
  metadata: JSON.stringify({ id: mockUserResourceId }),
});

describe("BannerbearService", () => {
  beforeEach(() => {
    // declare the service to test
    loggerService = TestSupport.spyOnClass(LoggerService);
    httpService = TestSupport.spyOnClass(HttpRequestService);
    bannerbearService = new BannerbearService(httpService, envConfig, loggerService);
  });

  describe("pushTask", () => {
    describe("fails correctly", () => {
      it("fails when Bannerbear service fails", async () => {
        httpService.post.and.throwError("Failed on bannerbear");
        try {
          await bannerbearService.pushTask(mockUserResourceId, mockImageTask());
          fail("Should have not gone thru");
        } catch (error: unknown) {
          expect(httpService.post).toHaveBeenCalledWith("https://api.bannerbear.com/v2/images", mockImageRequestDataFactory("IMAGE", mockModifications), undefined, { Authorization: `Bearer ${envConfig.bannerbear_key}` });
        }
      });
    });

    describe("success correctly", () => {
      it("creates an IMAGE resource task correctly", async () => {
        httpService.post.and.returnValue({ body: mockBannerbearResponseWithoutImage });
        try {
          const response = await bannerbearService.pushTask(mockUserResourceId, mockImageTask());

          expect(httpService.post).toHaveBeenCalledWith("https://api.bannerbear.com/v2/images", mockImageRequestDataFactory("IMAGE", mockModifications), undefined, { Authorization: `Bearer ${envConfig.bannerbear_key}` });
          expect(response).toBeDefined();
          expect(response).toEqual(mockBannerbearResponseWithoutImage);
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });

      it("creates a GIF2VIDEO resource task correctly", async () => {
        httpService.post.and.returnValue({ body: mockBannerbearResponseWithoutImage });
        try {
          const response = await bannerbearService.pushTask(mockUserResourceId, mockGif2VideoTask());

          expect(httpService.post).toHaveBeenCalledWith("https://api.bannerbear.com/v2/animated_gifs", mockImageRequestDataFactory("GIF2VIDEO", mockModifications), undefined, { Authorization: `Bearer ${envConfig.bannerbear_key}` });
          expect(response).toBeDefined();
          expect(response).toEqual(mockBannerbearResponseWithoutImage);
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });

      it("creates an imcomplete IMAGE resource task correctly", async () => {
        httpService.post.and.returnValue({ body: mockBannerbearResponseWithoutImage });
        const incompleteMockTask = { ...mockGif2VideoTask() };
        delete incompleteMockTask.options.templateParameters.channel;
        delete incompleteMockTask.options.templateParameters.subject;

        try {
          const response = await bannerbearService.pushTask(mockUserResourceId, incompleteMockTask);

          expect(httpService.post).toHaveBeenCalledWith("https://api.bannerbear.com/v2/images", mockImageRequestDataFactory("IMAGE", mockIncompleteRequestModifications), undefined, { Authorization: `Bearer ${envConfig.bannerbear_key}` });
          expect(response).toBeDefined();
          expect(response).toEqual(mockBannerbearResponseWithoutImage);
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });

      it("creates an imcomplete GIF2VIDEO resource task correctly", async () => {
        httpService.post.and.returnValue({ body: mockBannerbearResponseWithoutImage });
        const incompleteMockTask = { ...mockImageTask() };
        delete incompleteMockTask.options.templateParameters.channel;
        delete incompleteMockTask.options.templateParameters.subject;

        try {
          const response = await bannerbearService.pushTask(mockUserResourceId, incompleteMockTask);

          expect(httpService.post).toHaveBeenCalledWith("https://api.bannerbear.com/v2/animated_gifs", mockImageRequestDataFactory("GIF2VIDEO", mockIncompleteRequestModifications), undefined, { Authorization: `Bearer ${envConfig.bannerbear_key}` });
          expect(response).toBeDefined();
          expect(response).toEqual(mockBannerbearResponseWithoutImage);
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });
    });
  });

  describe("getTask", () => {
    describe("fails correctly", () => {
      it("fails when Bannerbear service fails", async () => {
        httpService.get.and.throwError("Failed on bannerbear");
        try {
          await bannerbearService.getTask(mockBannerbearResourceId, "IMAGE");
          fail("Should have not gone thru");
        } catch (error: unknown) {
          expect(httpService.get).toHaveBeenCalledWith(`https://api.bannerbear.com/v2/images/${mockBannerbearResourceId}`, undefined, { Authorization: `Bearer ${envConfig.bannerbear_key}` });
        }
      });
    });

    describe("success correctly", () => {
      it("creates an IMAGE resource task correctly", async () => {
        httpService.get.and.returnValue({ body: mockBannerbearResponseWithImage });
        try {
          const response = await bannerbearService.getTask(mockUserResourceId, "IMAGE");
          expect(response).toBeDefined();
          expect(response).toEqual(mockBannerbearResponseWithImage);
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });

      it("creates a GIF2VIDEO resource task correctly", async () => {
        httpService.get.and.returnValue({ body: mockBannerbearResponseWithImage });
        try {
          const response = await bannerbearService.getTask(mockUserResourceId, "GIF2VIDEO");
          expect(response).toBeDefined();
          expect(response).toEqual(mockBannerbearResponseWithImage);
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });
    });
  });
});
