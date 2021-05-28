import { fail } from "assert";
import * as crypto from "crypto";
import { TestSupport, Spied, LoggerService } from "@yac/core";

import { MediaDynamoRepository } from "../../repositories/media.dynamo.repository";
import { BannerbearService } from "../bannerbear.service";
import { MediaService } from "../media.service";
import { YacLegacyApiService } from "../yacLegacyApi.service";

let mediaRepository: Spied<MediaDynamoRepository>;
let loggerService: Spied<LoggerService>;
let yacLegacyApiService: Spied<YacLegacyApiService>;
let bannerbearService: Spied<BannerbearService>;
let mediaService: MediaService;

const mockMessageId = "123";
const mockYacToken = "yac-token-123";
const mockTaskFactory = (message: Record<string, string | number | null | Record<string, string> | unknown>) => ({
  type: message.type === "VIDEO" ? "GIF2VIDEO" : "IMAGE",
  options: {
    ...(message.type === "VIDEO" ? { source: "https://yac-production.s3-accelerate.amazonaws.com/test" } : {}),
    templateParameters: {
      username: message.isForwarded ? `@${message.actualMessageSenderName as string}` : `@${message.usernameFrom as string}`,
      ...(message.type === "AUDIO" ? { user_image: message.profileImageFrom } : {}),
      channel: message.isGroup ? `#${message.profileNameTo as string}` as `#${string}` : undefined,
      subject: (message.subject as string).length > 32 ? `${(message.subject as string).slice(0, 32)}...` : message.subject || undefined,
    },
  },
});
const mockYacMessageFactory = (type: string, isGroup: boolean, subject?: string, forwarded?: boolean) => ({
  actualMessageSenderId: forwarded ? 213 : null,
  actualMessageSenderName: forwarded ? "forwarder-test" : null,
  duration: 49,
  fileName: "https://yac-production.s3-accelerate.amazonaws.com/test",
  forwardMessageId: null,
  from: 11,
  hasReplies: 0,
  hyperlink: null,
  id: mockMessageId,
  isBroadCast: 0,
  isContinue: 0,
  isDefault: 0,
  isDeletedFrom: 0,
  isDeletedTo: 0,
  isForwarded: forwarded,
  isGroup,
  isNew: true,
  isSnoozed: 0,
  mediaFileName: "",
  mediaType: "",
  profileImageFrom: "https://media.yacchat.com/users/test",
  profileImageTo: "https://media.yacchat.com/groups/27/test",
  profileNameFrom: "Johndoe",
  usernameFrom: "atest",
  profileNameTo: "standups",
  publicShareUrl: "https://yac.com/play/test",
  reactions: {},
  replyTo: null,
  seenAt: null,
  sendAt: "2021-05-26T10:29:09.000Z",
  sender: false,
  snoozeAt: null,
  snoozedBy: 0,
  sortProp: "2021-05-26T10:29:09Z",
  subject: subject || "test subject",
  to: 123,
  transcript: "test transcript",
  type,
});
const mockBannerbearResponse = { uid: "test-example123" };
const mockDynamoDBResponse = { id: "mock-test-123", bannerbear_url: "bannerbear_url" };

function getChecksum(data: Record<string, string>): string {
  const encodedData = Buffer.from(JSON.stringify(data)).toString("base64");
  const hash = crypto.createHash("sha256");

  return hash.update(encodedData).digest("hex");
}

describe("MediaService", () => {
  beforeEach(() => {
    // declare the service to test
    loggerService = TestSupport.spyOnClass(LoggerService);
    yacLegacyApiService = TestSupport.spyOnClass(YacLegacyApiService);
    bannerbearService = TestSupport.spyOnClass(BannerbearService);
    mediaRepository = TestSupport.spyOnClass(MediaDynamoRepository);
    mediaService = new MediaService(loggerService, mediaRepository, yacLegacyApiService, bannerbearService);
  });

  describe("createMedia", () => {
    describe("fails correctly", () => {
      it("fails when BannerbearService fails", async () => {
        const yacMessage = mockYacMessageFactory("AUDIO", false);
        const task = mockTaskFactory(yacMessage);
        const resourceId = `${yacMessage.isGroup ? "GROUP" : "USER"}-${yacMessage.id}`;

        bannerbearService.pushTask.and.throwError("Failed on bannerbear");
        yacLegacyApiService.getMessage.and.returnValue(yacMessage);

        try {
          await mediaService.createMedia(yacMessage.id, Boolean(yacMessage.isGroup), mockYacToken);
          fail("Should have not gone thru");
        } catch (error: unknown) {
          expect(bannerbearService.pushTask).toHaveBeenCalledWith(resourceId, task);
        }
      });

      it("fails when a strange message type is given", async () => {
        const yacMessage = mockYacMessageFactory("IMAGE", false);

        yacLegacyApiService.getMessage.and.returnValue(yacMessage);

        try {
          await mediaService.createMedia(yacMessage.id, Boolean(yacMessage.isGroup), mockYacToken);
          fail("Should have not gone thru");
        } catch (error: unknown) {
          expect(yacLegacyApiService.getMessage).toHaveBeenCalledWith(yacMessage.id, Boolean(yacMessage.isGroup), mockYacToken);
        }
      });

      it("fails when a message does not exist on Yac API", async () => {
        const yacMessage = mockYacMessageFactory("AUDIO", false);

        yacLegacyApiService.getMessage.and.returnValue(null);

        try {
          await mediaService.createMedia(yacMessage.id, Boolean(yacMessage.isGroup), mockYacToken);
          fail("Should have not gone thru");
        } catch (error: unknown) {
          expect(yacLegacyApiService.getMessage).toHaveBeenCalledWith(yacMessage.id, Boolean(yacMessage.isGroup), mockYacToken);
        }
      });

      it("fails when unable to save on repository", async () => {
        const yacMessage = mockYacMessageFactory("AUDIO", false);
        const resourceId = `${yacMessage.isGroup ? "GROUP" : "USER"}-${yacMessage.id}`;
        const messageChecksum = getChecksum({
          senderUsername: yacMessage.usernameFrom,
          senderRealName: yacMessage.profileNameFrom,
          senderImage: yacMessage.profileImageFrom,
        });

        bannerbearService.pushTask.and.returnValue(mockBannerbearResponse);
        yacLegacyApiService.getMessage.and.returnValue(yacMessage);
        mediaRepository.create.and.throwError("Failed to save on DynamoDB");

        try {
          await mediaService.createMedia(yacMessage.id, Boolean(yacMessage.isGroup), mockYacToken);
          fail("Should have not gone thru");
        } catch (error: unknown) {
          expect(mediaRepository.create).toHaveBeenCalledWith(resourceId, messageChecksum, mockBannerbearResponse.uid);
        }
      });
    });

    describe("success correctly", () => {
      it("creates a new IMAGE media resource entry on dynamo", async () => {
        const yacMessage = mockYacMessageFactory("AUDIO", false);
        const resourceId = `${yacMessage.isGroup ? "GROUP" : "USER"}-${yacMessage.id}`;
        const messageChecksum = getChecksum({
          senderUsername: yacMessage.usernameFrom,
          senderRealName: yacMessage.profileNameFrom,
          senderImage: yacMessage.profileImageFrom,
        });

        bannerbearService.pushTask.and.returnValue(mockBannerbearResponse);
        yacLegacyApiService.getMessage.and.returnValue(yacMessage);
        mediaRepository.create.and.returnValue({ id: mockDynamoDBResponse.id });

        try {
          const response = await mediaService.createMedia(yacMessage.id, Boolean(yacMessage.isGroup), mockYacToken);

          expect(mediaRepository.create).toHaveBeenCalledWith(resourceId, messageChecksum, mockBannerbearResponse.uid);
          expect(response).toBeDefined();
          expect(response.id).toEqual(mockDynamoDBResponse.id);
        } catch (error: unknown) {
          fail("Should have not failed");
        }
      });

      it("creates a new GIF2VIDEO media resource entry on dynamo", async () => {
        const yacMessage = mockYacMessageFactory("VIDEO", true);
        const resourceId = `${yacMessage.isGroup ? "GROUP" : "USER"}-${yacMessage.id}`;
        const messageChecksum = getChecksum({
          senderUsername: yacMessage.usernameFrom,
          senderRealName: yacMessage.profileNameFrom,
          senderImage: yacMessage.profileImageFrom,
        });

        bannerbearService.pushTask.and.returnValue(mockBannerbearResponse);
        yacLegacyApiService.getMessage.and.returnValue(yacMessage);
        mediaRepository.create.and.returnValue({ id: mockDynamoDBResponse.id });

        try {
          const response = await mediaService.createMedia(yacMessage.id, Boolean(yacMessage.isGroup), mockYacToken);

          expect(mediaRepository.create).toHaveBeenCalledWith(resourceId, messageChecksum, mockBannerbearResponse.uid);
          expect(response).toBeDefined();
          expect(response.id).toEqual(mockDynamoDBResponse.id);
        } catch (error: unknown) {
          fail("Should have not failed");
        }
      });

      it("creates a new media GIF2VIDEO resource entry on dynamo: with a trimmed long subject", async () => {
        const longSubject = "this is a very long subject that should be trimmed";
        const yacMessage = mockYacMessageFactory("VIDEO", true, longSubject);
        const resourceId = `${yacMessage.isGroup ? "GROUP" : "USER"}-${yacMessage.id}`;
        const messageChecksum = getChecksum({
          senderUsername: yacMessage.usernameFrom,
          senderRealName: yacMessage.profileNameFrom,
          senderImage: yacMessage.profileImageFrom,
        });

        bannerbearService.pushTask.and.returnValue(mockBannerbearResponse);
        yacLegacyApiService.getMessage.and.returnValue(yacMessage);
        mediaRepository.create.and.returnValue({ id: mockDynamoDBResponse.id });

        try {
          const response = await mediaService.createMedia(yacMessage.id, Boolean(yacMessage.isGroup), mockYacToken);

          expect(mediaRepository.create).toHaveBeenCalledWith(resourceId, messageChecksum, mockBannerbearResponse.uid);
          expect(bannerbearService.pushTask).toHaveBeenCalledWith(resourceId, mockTaskFactory(yacMessage));
          expect(response).toBeDefined();
          expect(response.id).toEqual(mockDynamoDBResponse.id);
        } catch (error: unknown) {
          fail("Should have not failed");
        }
      });

      it("creates a new media IMAGE resource entry on dynamo: with a trimmed long subject", async () => {
        const longSubject = "this is a very long subject that should be trimmed";
        const yacMessage = mockYacMessageFactory("AUDIO", true, longSubject);
        const resourceId = `${yacMessage.isGroup ? "GROUP" : "USER"}-${yacMessage.id}`;
        const messageChecksum = getChecksum({
          senderUsername: yacMessage.usernameFrom,
          senderRealName: yacMessage.profileNameFrom,
          senderImage: yacMessage.profileImageFrom,
        });

        bannerbearService.pushTask.and.returnValue(mockBannerbearResponse);
        yacLegacyApiService.getMessage.and.returnValue(yacMessage);
        mediaRepository.create.and.returnValue({ id: mockDynamoDBResponse.id });

        try {
          const response = await mediaService.createMedia(yacMessage.id, Boolean(yacMessage.isGroup), mockYacToken);

          expect(mediaRepository.create).toHaveBeenCalledWith(resourceId, messageChecksum, mockBannerbearResponse.uid);
          expect(bannerbearService.pushTask).toHaveBeenCalledWith(resourceId, mockTaskFactory(yacMessage));
          expect(response).toBeDefined();
          expect(response.id).toEqual(mockDynamoDBResponse.id);
        } catch (error: unknown) {
          fail("Should have not failed");
        }
      });

      it("creates a new GIF2VIDEO media resource entry on dynamo: with a forwarded message", async () => {
        const yacMessage = mockYacMessageFactory("VIDEO", false, undefined, true);
        const resourceId = `${yacMessage.isGroup ? "GROUP" : "USER"}-${yacMessage.id}`;
        const messageChecksum = getChecksum({
          senderUsername: yacMessage.usernameFrom,
          senderRealName: yacMessage.profileNameFrom,
          senderImage: yacMessage.profileImageFrom,
        });

        bannerbearService.pushTask.and.returnValue(mockBannerbearResponse);
        yacLegacyApiService.getMessage.and.returnValue(yacMessage);
        yacLegacyApiService.getUserImageAndNameWithId.and.returnValue({ username: yacMessage.actualMessageSenderName, image: yacMessage.profileImageFrom });
        mediaRepository.create.and.returnValue({ id: mockDynamoDBResponse.id });

        try {
          const response = await mediaService.createMedia(yacMessage.id, Boolean(yacMessage.isGroup), mockYacToken);

          expect(mediaRepository.create).toHaveBeenCalledWith(resourceId, messageChecksum, mockBannerbearResponse.uid);
          expect(bannerbearService.pushTask).toHaveBeenCalledWith(resourceId, mockTaskFactory(yacMessage));
          expect(response).toBeDefined();
          expect(response.id).toEqual(mockDynamoDBResponse.id);
        } catch (error: unknown) {
          fail("Should have not failed");
        }
      });

      it("creates a new IMAGE media resource entry on dynamo: with a forwarded message", async () => {
        const yacMessage = mockYacMessageFactory("AUDIO", false, undefined, true);
        const resourceId = `${yacMessage.isGroup ? "GROUP" : "USER"}-${yacMessage.id}`;
        const messageChecksum = getChecksum({
          senderUsername: yacMessage.usernameFrom,
          senderRealName: yacMessage.profileNameFrom,
          senderImage: yacMessage.profileImageFrom,
        });

        bannerbearService.pushTask.and.returnValue(mockBannerbearResponse);
        yacLegacyApiService.getMessage.and.returnValue(yacMessage);
        yacLegacyApiService.getUserImageAndNameWithId.and.returnValue({ username: yacMessage.actualMessageSenderName, image: yacMessage.profileImageFrom });
        mediaRepository.create.and.returnValue({ id: mockDynamoDBResponse.id });

        try {
          const response = await mediaService.createMedia(yacMessage.id, Boolean(yacMessage.isGroup), mockYacToken);

          expect(mediaRepository.create).toHaveBeenCalledWith(resourceId, messageChecksum, mockBannerbearResponse.uid);
          expect(bannerbearService.pushTask).toHaveBeenCalledWith(resourceId, mockTaskFactory(yacMessage));
          expect(response).toBeDefined();
          expect(response.id).toEqual(mockDynamoDBResponse.id);
        } catch (error: unknown) {
          fail("Should have not failed");
        }
      });
    });
  });

  describe("getMedia", () => {
    describe("fails correctly", () => {
      it("fails when MediaRepository fails", async () => {
        const yacMessage = mockYacMessageFactory("AUDIO", false);
        const resourceId = `${yacMessage.isGroup ? "GROUP" : "USER"}-${yacMessage.id}`;

        mediaRepository.get.and.throwError("Failed on DynamoDB");

        try {
          await mediaService.getMedia(yacMessage.id, Boolean(yacMessage.isGroup), mockYacToken);
          fail("Should have not gone thru");
        } catch (error: unknown) {
          expect(mediaRepository.get).toHaveBeenCalledWith(resourceId);
        }
      });
    });

    describe("success correctly", () => {
      it("returns Bannerbear image_url", async () => {
        const yacMessage = mockYacMessageFactory("AUDIO", false);
        const resourceId = `${yacMessage.isGroup ? "GROUP" : "USER"}-${yacMessage.id}`;

        mediaRepository.get.and.returnValue(mockDynamoDBResponse);

        try {
          const response = await mediaService.getMedia(yacMessage.id, Boolean(yacMessage.isGroup), mockYacToken);

          expect(mediaRepository.get).toHaveBeenCalledWith(resourceId);
          expect(response).toBeDefined();
          expect(response.url).toEqual(mockDynamoDBResponse.bannerbear_url);
        } catch (error: unknown) {
          fail("Should have not failed");
        }
      });

      it("returns default image when Bannerbear image_url is not set", async () => {
        const yacMessage = mockYacMessageFactory("AUDIO", true);
        const resourceId = `${yacMessage.isGroup ? "GROUP" : "USER"}-${yacMessage.id}`;

        mediaRepository.get.and.returnValue({ id: mockDynamoDBResponse.id });

        try {
          const response = await mediaService.getMedia(yacMessage.id, Boolean(yacMessage.isGroup), mockYacToken);

          expect(mediaRepository.get).toHaveBeenCalledWith(resourceId);
          expect(response).toBeDefined();
          expect(response.url).toEqual("https://yac-resources.s3.amazonaws.com/mediaplayer_thumb.png");
        } catch (error: unknown) {
          fail("Should have not failed");
        }
      });
    });
  });

  describe("updateMedia", () => {
    describe("fails correctly", () => {
      it("fails when MediaRepository fails", async () => {
        const yacMessage = mockYacMessageFactory("AUDIO", true);
        const resourceId = `${yacMessage.isGroup ? "GROUP" : "USER"}-${yacMessage.id}`;

        mediaRepository.update.and.throwError("Failed on DynamoDB");

        try {
          await mediaService.updateMedia(resourceId as `${"USER" | "GROUP"}-${string}`, mockDynamoDBResponse.bannerbear_url);
          fail("Should have not gone thru");
        } catch (error: unknown) {
          expect(mediaRepository.update).toHaveBeenCalledWith(resourceId, mockDynamoDBResponse.bannerbear_url);
        }
      });
    });

    describe("success correctly", () => {
      it("updates the DynamoDB resource", async () => {
        const yacMessage = mockYacMessageFactory("AUDIO", false);
        const resourceId = `${yacMessage.isGroup ? "GROUP" : "USER"}-${yacMessage.id}`;

        try {
          await mediaService.updateMedia(resourceId as `${"USER" | "GROUP"}-${string}`, mockDynamoDBResponse.bannerbear_url);
          expect(mediaRepository.update).toHaveBeenCalledWith(resourceId, mockDynamoDBResponse.bannerbear_url);
        } catch (error: unknown) {
          fail("Should have not failed");
        }
      });
    });
  });
});
