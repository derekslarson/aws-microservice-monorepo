// import { BadRequestError, LoggerService, LoggerServiceInterface, Spied, TestSupport } from "@yac/util";
// import { ConversationUserRelationshipService, ConversationUserRelationshipServiceInterface } from "../../entity-services/conversationUserRelationship.service";
// import { ImageFileService, ImageFileServiceInterface } from "../../entity-services/image.file.service";
// import { TeamUserRelationshipService, TeamUserRelationshipServiceInterface } from "../../entity-services/teamUserRelationship.service";
// import { UniquePropertyService, UniquePropertyServiceInterface } from "../../entity-services/uniqueProperty.service";
// import { CreateUserInput, UserService, UserServiceInterface } from "../../entity-services/user.service";
// import { EntityType } from "../../enums/entityType.enum";
// import { ImageMimeType } from "../../enums/image.mimeType.enum";
// import { UniqueProperty } from "../../enums/uniqueProperty.enum";
// import { UserMediatorService, UserMediatorServiceInterface, GetUserInput, GetUserImageUploadUrlInput, GetUserByEmailInput, GetUserByPhoneInput, GetUserByUsernameInput, GetOrCreateUserByEmailInput, GetOrCreateUserByPhoneInput, GetUsersByTeamIdInput, GetUsersByGroupIdInput, GetUsersByMeetingIdInput } from "../user.mediator.service";

// interface UserMediatorServiceInterfaceWithAnyMethod extends UserMediatorServiceInterface {
//   [key: string]: any
// }

// describe("UserMediatorService", () => {
//   let loggerService: Spied<LoggerServiceInterface>;
//   let userService: Spied<UserServiceInterface>;
//   let teamUserRelationshipService: Spied<TeamUserRelationshipServiceInterface>;
//   let conversationUserRelationshipService: Spied<ConversationUserRelationshipServiceInterface>;
//   let uniquePropertyService: Spied<UniquePropertyServiceInterface>;
//   let imageFileService: Spied<ImageFileServiceInterface>;

//   let userMediatorService: UserMediatorServiceInterfaceWithAnyMethod;

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     userService = TestSupport.spyOnClass(UserService);
//     teamUserRelationshipService = TestSupport.spyOnClass(TeamUserRelationshipService);
//     conversationUserRelationshipService = TestSupport.spyOnClass(ConversationUserRelationshipService);
//     uniquePropertyService = TestSupport.spyOnClass(UniquePropertyService);
//     imageFileService = TestSupport.spyOnClass(ImageFileService);

//     userMediatorService = new UserMediatorService(loggerService, userService, teamUserRelationshipService, conversationUserRelationshipService, uniquePropertyService, imageFileService);
//   });

//   describe("createUser", () => {
//     describe("should fail correctly when", () => {
//       it("is called with an already registered `email`", async () => {
//         const params: CreateUserInput = { email: "test@yac.com", imageMimeType: ImageMimeType.Png };

//         uniquePropertyService.isPropertyUnique.and.returnValue({ isPropertyUnique: false });

//         try {
//           await userMediatorService.createUser(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in createUser", { error, params }, userMediatorService.constructor.name);
//           expect(uniquePropertyService.isPropertyUnique).toHaveBeenCalled();
//           expect(uniquePropertyService.isPropertyUnique).toHaveBeenCalledWith({ property: UniqueProperty.Email, value: params.email });
//           expect(error).toBeInstanceOf(BadRequestError);
//         }
//       });

//       it("is called with an already registered `phone`", async () => {
//         const params: CreateUserInput = { phone: "+123456789", imageMimeType: ImageMimeType.Png };

//         uniquePropertyService.isPropertyUnique.and.returnValue({ isPropertyUnique: false });

//         try {
//           await userMediatorService.createUser(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in createUser", { error, params }, userMediatorService.constructor.name);
//           expect(uniquePropertyService.isPropertyUnique).toHaveBeenCalled();
//           expect(uniquePropertyService.isPropertyUnique).toHaveBeenCalledWith({ property: UniqueProperty.Phone, value: params.phone });
//           expect(error).toBeInstanceOf(BadRequestError);
//         }
//       });

//       it("is called with an already registered `username`", async () => {
//         const params: CreateUserInput = { phone: "+123456789", username: "hello", imageMimeType: ImageMimeType.Png };
//         uniquePropertyService.isPropertyUnique.and.returnValues({ isPropertyUnique: true }, { isPropertyUnique: false });
//         try {
//           await userMediatorService.createUser(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in createUser", { error, params }, userMediatorService.constructor.name);
//           expect(uniquePropertyService.isPropertyUnique).toHaveBeenCalledTimes(2);
//           expect(uniquePropertyService.isPropertyUnique).toHaveBeenCalledWith({ property: UniqueProperty.Phone, value: params.phone });
//           expect(uniquePropertyService.isPropertyUnique).toHaveBeenCalledWith({ property: UniqueProperty.Username, value: params.username });
//           expect(error).toBeInstanceOf(BadRequestError);
//         }
//       });

//       it("fails to create an image", async () => {
//         const params: CreateUserInput = { phone: "+123456789", username: "hello", imageMimeType: ImageMimeType.Png };
//         const mockError = new Error("Failed to create image");
//         uniquePropertyService.isPropertyUnique.and.returnValue({ isPropertyUnique: true });
//         imageFileService.createDefaultImage.and.throwError(mockError);
//         try {
//           await userMediatorService.createUser(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in createUser", { error, params }, userMediatorService.constructor.name);
//           expect(imageFileService.createDefaultImage).toHaveBeenCalledTimes(1);
//           expect(imageFileService.createDefaultImage).toHaveBeenCalledWith();
//           expect(error).toBe(mockError);
//         }
//       });

//       it("fails to create an user entry", async () => {
//         const params: CreateUserInput = { phone: "+123456789", username: "hello", imageMimeType: ImageMimeType.Png, email: "test@mail.com", name: "test user" };
//         const mockError = new Error("Failed to create image");

//         uniquePropertyService.isPropertyUnique.and.returnValue({ isPropertyUnique: true });
//         imageFileService.createDefaultImage.and.returnValue({ image: "mock-base64", mimeType: ImageMimeType.Png });
//         userService.createUser.and.throwError(mockError);
//         try {
//           await userMediatorService.createUser(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in createUser", { error, params }, userMediatorService.constructor.name);
//           expect(userService.createUser).toHaveBeenCalledTimes(1);
//           expect(userService.createUser).toHaveBeenCalledWith({
//             ...params,
//             imageMimeType: ImageMimeType.Png,
//           });
//           expect(error).toBe(mockError);
//         }
//       });

//       it("fails to upload a default user image", async () => {
//         const params: CreateUserInput = { phone: "+123456789", username: "hello", imageMimeType: ImageMimeType.Png, email: "test@mail.com", name: "test user" };
//         const mockError = new Error("Failed to create image");
//         const mockUser = { id: "mock-user-id" };

//         uniquePropertyService.isPropertyUnique.and.returnValue({ isPropertyUnique: true });
//         imageFileService.createDefaultImage.and.returnValue({ image: "mock-base64", mimeType: ImageMimeType.Png });
//         userService.createUser.and.returnValue({ user: mockUser });
//         imageFileService.uploadFile.and.throwError(mockError);

//         try {
//           await userMediatorService.createUser(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in createUser", { error, params }, userMediatorService.constructor.name);
//           expect(imageFileService.uploadFile).toHaveBeenCalledTimes(1);
//           expect(imageFileService.uploadFile).toHaveBeenCalledWith({ entityType: EntityType.User, entityId: mockUser.id, file: "mock-base64", mimeType: ImageMimeType.Png });
//           expect(error).toBe(mockError);
//         }
//       });

//       it("fails to create an unique `email` entry", async () => {
//         const params: CreateUserInput = { imageMimeType: ImageMimeType.Png, email: "test@mail.com", name: "test user" };
//         const mockError = new Error("Failed to create image");
//         const mockUser = { id: "mock-user-id" };

//         uniquePropertyService.isPropertyUnique.and.returnValue({ isPropertyUnique: true });
//         imageFileService.createDefaultImage.and.returnValue({ image: "mock-base64", mimeType: ImageMimeType.Png });
//         userService.createUser.and.returnValue({ user: mockUser });
//         imageFileService.uploadFile.and.returnValue();
//         uniquePropertyService.createUniqueProperty.and.throwError(mockError);

//         try {
//           await userMediatorService.createUser(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in createUser", { error, params }, userMediatorService.constructor.name);
//           expect(uniquePropertyService.createUniqueProperty).toHaveBeenCalledTimes(1);
//           expect(uniquePropertyService.createUniqueProperty).toHaveBeenCalledWith({ property: UniqueProperty.Email, value: params.email, userId: mockUser.id });
//           expect(error).toBe(mockError);
//         }
//       });

//       it("fails to create an unique `phone` entry", async () => {
//         const params: CreateUserInput = { phone: "+123456789", imageMimeType: ImageMimeType.Png, name: "test user" };
//         const mockError = new Error("Failed to create image");
//         const mockUser = { id: "mock-user-id" };

//         uniquePropertyService.isPropertyUnique.and.returnValue({ isPropertyUnique: true });
//         imageFileService.createDefaultImage.and.returnValue({ image: "mock-base64", mimeType: ImageMimeType.Png });
//         userService.createUser.and.returnValue({ user: mockUser });
//         imageFileService.uploadFile.and.returnValue();
//         uniquePropertyService.createUniqueProperty.and.throwError(mockError);

//         try {
//           await userMediatorService.createUser(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in createUser", { error, params }, userMediatorService.constructor.name);
//           expect(uniquePropertyService.createUniqueProperty).toHaveBeenCalledTimes(1);
//           expect(uniquePropertyService.createUniqueProperty).toHaveBeenCalledWith({ property: UniqueProperty.Phone, value: params.phone, userId: mockUser.id });
//           expect(error).toBe(mockError);
//         }
//       });

//       it("fails to create an unique `username` entry", async () => {
//         const params: CreateUserInput = { phone: "+123456789", username: "hello", imageMimeType: ImageMimeType.Png, name: "test user" };
//         const mockError = new Error("Failed to create image");
//         const mockUser = { id: "mock-user-id" };

//         uniquePropertyService.isPropertyUnique.and.returnValue({ isPropertyUnique: true });
//         imageFileService.createDefaultImage.and.returnValue({ image: "mock-base64", mimeType: ImageMimeType.Png });
//         userService.createUser.and.returnValue({ user: mockUser });
//         imageFileService.uploadFile.and.returnValue();
//         uniquePropertyService.createUniqueProperty.and.returnValues(null, Promise.reject(mockError));

//         try {
//           await userMediatorService.createUser(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in createUser", { error, params }, userMediatorService.constructor.name);
//           expect(uniquePropertyService.createUniqueProperty).toHaveBeenCalledTimes(2);
//           expect(uniquePropertyService.createUniqueProperty.calls.allArgs())
//             .toEqual([ [ { property: UniqueProperty.Phone, value: params.phone, userId: mockUser.id } ], [ { property: UniqueProperty.Username, value: params.username, userId: mockUser.id } ] ]);
//           // expect(uniquePropertyService.createUniqueProperty).toHaveBeenCalledWith({ property: UniqueProperty.Username, value: params.username, userId: mockUser.id });
//           expect(error).toBe(mockError);
//         }
//       });

//       it("fails to fetch signed-url of the default image", async () => {
//         const params: CreateUserInput = { phone: "+123456789", username: "hello", imageMimeType: ImageMimeType.Png, name: "test user" };
//         const mockError = new Error("Failed to create image");
//         const mockUser = { id: "mock-user-id" };

//         uniquePropertyService.isPropertyUnique.and.returnValue({ isPropertyUnique: true });
//         imageFileService.createDefaultImage.and.returnValue({ image: "mock-base64", mimeType: ImageMimeType.Png });
//         userService.createUser.and.returnValue({ user: { ...mockUser, ...params } });
//         imageFileService.uploadFile.and.returnValue();
//         uniquePropertyService.createUniqueProperty.and.returnValues();
//         imageFileService.getSignedUrl.and.throwError(mockError);

//         try {
//           await userMediatorService.createUser(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in createUser", { error, params }, userMediatorService.constructor.name);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledTimes(1);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "get",
//             entityType: EntityType.User,
//             entityId: mockUser.id,
//             mimeType: params.imageMimeType,
//           });
//           expect(error).toBe(mockError);
//         }
//       });
//     });

//     describe("successfully completes when", () => {
//       it("tries to create an user with the right parameters with only a `phone`", async () => {
//         const params: CreateUserInput = { phone: "+123456789", username: "hello", imageMimeType: ImageMimeType.Png, name: "test user" };
//         const mockUser = { id: "mock-user-id" };
//         const mockSignedUrl = { signedUrl: "mocked-signed-url" };

//         uniquePropertyService.isPropertyUnique.and.returnValue({ isPropertyUnique: true });
//         imageFileService.createDefaultImage.and.returnValue({ image: "mock-base64", mimeType: ImageMimeType.Png });
//         userService.createUser.and.returnValue({ user: { ...mockUser, ...params } });
//         imageFileService.uploadFile.and.returnValue();
//         uniquePropertyService.createUniqueProperty.and.returnValues();
//         imageFileService.getSignedUrl.and.returnValues(mockSignedUrl);

//         const { imageMimeType, ...expectedResponse } = {
//           ...mockUser,
//           ...params,
//           image: mockSignedUrl.signedUrl,
//         };

//         try {
//           const res = await userMediatorService.createUser(params);

//           expect(uniquePropertyService.isPropertyUnique).toHaveBeenCalledTimes(2);
//           expect(uniquePropertyService.isPropertyUnique.calls.allArgs())
//             .toEqual([ [ { property: UniqueProperty.Phone, value: params.phone } ], [ { property: UniqueProperty.Username, value: params.username } ] ]);
//           expect(imageFileService.createDefaultImage).toHaveBeenCalledTimes(1);
//           expect(imageFileService.createDefaultImage).toHaveBeenCalledWith();
//           expect(userService.createUser).toHaveBeenCalledTimes(1);
//           expect(userService.createUser).toHaveBeenCalledWith({
//             ...params,
//             email: undefined,
//             imageMimeType: ImageMimeType.Png,
//           });
//           expect(imageFileService.uploadFile).toHaveBeenCalledTimes(1);
//           expect(imageFileService.uploadFile).toHaveBeenCalledWith({ entityType: EntityType.User, entityId: mockUser.id, file: "mock-base64", mimeType: ImageMimeType.Png });
//           expect(uniquePropertyService.createUniqueProperty).toHaveBeenCalledTimes(2);
//           expect(uniquePropertyService.createUniqueProperty.calls.allArgs())
//             .toEqual([ [ { property: UniqueProperty.Phone, value: params.phone, userId: mockUser.id } ], [ { property: UniqueProperty.Username, value: params.username, userId: mockUser.id } ] ]);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledTimes(1);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "get",
//             entityType: EntityType.User,
//             entityId: mockUser.id,
//             mimeType: params.imageMimeType,
//           });
//           expect(res).toEqual({ user: expectedResponse });
//         } catch (error: unknown) {
//           fail("Should have not errored");
//         }
//       });

//       it("tries to create an user with the right parameters with only a `email`", async () => {
//         const params: CreateUserInput = { email: "mock@email.com", username: "hello", imageMimeType: ImageMimeType.Png, name: "test user" };
//         const mockUser = { id: "mock-user-id" };
//         const mockSignedUrl = { signedUrl: "mocked-signed-url" };

//         uniquePropertyService.isPropertyUnique.and.returnValue({ isPropertyUnique: true });
//         imageFileService.createDefaultImage.and.returnValue({ image: "mock-base64", mimeType: ImageMimeType.Png });
//         userService.createUser.and.returnValue({ user: { ...mockUser, ...params } });
//         imageFileService.uploadFile.and.returnValue();
//         uniquePropertyService.createUniqueProperty.and.returnValues();
//         imageFileService.getSignedUrl.and.returnValues(mockSignedUrl);

//         const { imageMimeType, ...expectedResponse } = {
//           ...mockUser,
//           ...params,
//           image: mockSignedUrl.signedUrl,
//         };

//         try {
//           const res = await userMediatorService.createUser(params);

//           expect(uniquePropertyService.isPropertyUnique).toHaveBeenCalledTimes(2);
//           expect(uniquePropertyService.isPropertyUnique.calls.allArgs())
//             .toEqual([ [ { property: UniqueProperty.Email, value: params.email } ], [ { property: UniqueProperty.Username, value: params.username } ] ]);
//           expect(imageFileService.createDefaultImage).toHaveBeenCalledTimes(1);
//           expect(imageFileService.createDefaultImage).toHaveBeenCalledWith();
//           expect(userService.createUser).toHaveBeenCalledTimes(1);
//           expect(userService.createUser).toHaveBeenCalledWith({
//             ...params,
//             phone: undefined,
//             imageMimeType: ImageMimeType.Png,
//           });
//           expect(imageFileService.uploadFile).toHaveBeenCalledTimes(1);
//           expect(imageFileService.uploadFile).toHaveBeenCalledWith({ entityType: EntityType.User, entityId: mockUser.id, file: "mock-base64", mimeType: ImageMimeType.Png });
//           expect(uniquePropertyService.createUniqueProperty).toHaveBeenCalledTimes(2);
//           expect(uniquePropertyService.createUniqueProperty.calls.allArgs())
//             .toEqual([ [ { property: UniqueProperty.Email, value: params.email, userId: mockUser.id } ], [ { property: UniqueProperty.Username, value: params.username, userId: mockUser.id } ] ]);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledTimes(1);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "get",
//             entityType: EntityType.User,
//             entityId: mockUser.id,
//             mimeType: params.imageMimeType,
//           });
//           expect(res).toEqual({ user: expectedResponse });
//         } catch (error: unknown) {
//           fail("Should have not errored");
//         }
//       });
//     });
//   });

//   describe("getUser", () => {
//     describe("should fail correctly when", () => {
//       it("userService.getUser errors", async () => {
//         const params: GetUserInput = { userId: "user-mock-id" };
//         const mockError = new Error("Failed to continue");

//         userService.getUser.and.throwError(mockError);

//         try {
//           await userMediatorService.getUser(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUser", { error, params }, userMediatorService.constructor.name);
//           expect(userService.getUser).toHaveBeenCalledTimes(1);
//           expect(userService.getUser).toHaveBeenCalledWith({ userId: params.userId });
//           expect(error).toBe(mockError);
//         }
//       });

//       it("imageFileService.getSignedUrl errors", async () => {
//         const params: GetUserInput = { userId: "user-mock-id" };
//         const mockUser = { id: params.userId, username: "mock", name: "test mock", email: "mock@test.com", imageMimeType: ImageMimeType.Png };
//         const mockError = new Error("Failed to continue");

//         userService.getUser.and.returnValue({ user: mockUser });
//         imageFileService.getSignedUrl.and.throwError(mockError);

//         try {
//           await userMediatorService.getUser(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUser", { error, params }, userMediatorService.constructor.name);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledTimes(1);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "get",
//             entityType: EntityType.User,
//             entityId: mockUser.id,
//             mimeType: mockUser.imageMimeType,
//           });
//           expect(error).toBe(mockError);
//         }
//       });
//     });
//     describe("successfully completes when", () => {
//       it("returns a user object with its image", async () => {
//         const params: GetUserInput = { userId: "user-mock-id" };
//         const mockUser = { id: params.userId, username: "mock", name: "test mock", email: "mock@test.com", imageMimeType: ImageMimeType.Png };
//         const mockImage = { signedUrl: "mock-signed-url" };
//         const { imageMimeType, ...expectedResponse } = { ...mockUser, image: mockImage.signedUrl };

//         userService.getUser.and.returnValue({ user: mockUser });
//         imageFileService.getSignedUrl.and.returnValue(mockImage);

//         try {
//           const response = await userMediatorService.getUser(params);

//           expect(response).toEqual({ user: expectedResponse });
//           expect(userService.getUser).toHaveBeenCalledTimes(1);
//           expect(userService.getUser).toHaveBeenCalledWith({ userId: params.userId });
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledTimes(1);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "get",
//             entityType: EntityType.User,
//             entityId: mockUser.id,
//             mimeType: mockUser.imageMimeType,
//           });
//         } catch (error: unknown) {
//           fail("Should have not failed");
//         }
//       });
//     });
//   });

//   describe("getUserImageUploadUrl", () => {
//     describe("should fail correctly when", () => {
//       it("imageFileService.getSignedUrl errors", () => {
//         const params: GetUserImageUploadUrlInput = { userId: "user-mock-id", mimeType: ImageMimeType.Png };
//         const mockError = new Error("Failed to continue");

//         imageFileService.getSignedUrl.and.throwError(mockError);

//         try {
//           userMediatorService.getUserImageUploadUrl(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUserImageUploadUrl", { error, params }, userMediatorService.constructor.name);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledTimes(1);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "upload",
//             entityType: EntityType.User,
//             entityId: params.userId,
//             mimeType: params.mimeType,
//           });
//           expect(error).toBe(mockError);
//         }
//       });
//     });
//     describe("successfully completes when", () => {
//       it("returns a upload signed-url", () => {
//         const params: GetUserImageUploadUrlInput = { userId: "user-mock-id", mimeType: ImageMimeType.Png };
//         const mockImage = { signedUrl: "mock-signed-url" };

//         imageFileService.getSignedUrl.and.returnValue(mockImage);

//         try {
//           const response = userMediatorService.getUserImageUploadUrl(params);

//           expect(response).toEqual({ uploadUrl: mockImage.signedUrl });
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledTimes(1);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "upload",
//             entityType: EntityType.User,
//             entityId: params.userId,
//             mimeType: params.mimeType,
//           });
//         } catch (error: unknown) {
//           fail("Should have not failed");
//         }
//       });
//     });
//   });

//   describe("getUserByEmail", () => {
//     let mockGetUserFunction: jasmine.Spy;
//     beforeEach(() => {
//       mockGetUserFunction = spyOn(userMediatorService, "getUser");
//     });

//     describe("should fail correctly when", () => {
//       it("uniquePropertyService.getUniqueProperty errors", async () => {
//         const params: GetUserByEmailInput = { email: "test@email.com" };
//         const mockError = new Error("Failed to continue");

//         uniquePropertyService.getUniqueProperty.and.throwError(mockError);

//         try {
//           await userMediatorService.getUserByEmail(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUserByEmail", { error, params }, userMediatorService.constructor.name);
//           expect(uniquePropertyService.getUniqueProperty).toHaveBeenCalledTimes(1);
//           expect(uniquePropertyService.getUniqueProperty).toHaveBeenCalledWith({ property: UniqueProperty.Email, value: params.email });
//           expect(error).toBe(mockError);
//         }
//       });

//       it("getUser errors", async () => {
//         const params: GetUserByEmailInput = { email: "test@email.com" };
//         const mockUserId = "user-mock-id";
//         const mockError = new Error("Failed to continue");

//         uniquePropertyService.getUniqueProperty.and.returnValue({ uniqueProperty: { userId: mockUserId } });
//         mockGetUserFunction.and.throwError(mockError);

//         try {
//           await userMediatorService.getUserByEmail(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUserByEmail", { error, params }, userMediatorService.constructor.name);
//           expect(mockGetUserFunction).toHaveBeenCalledTimes(1);
//           expect(mockGetUserFunction).toHaveBeenCalledWith({ userId: mockUserId });
//           expect(error).toBe(mockError);
//         }
//       });
//     });
//     describe("successfully completes when", () => {
//       it("returns the found user", async () => {
//         const params: GetUserByEmailInput = { email: "test@email.com" };
//         const mockUserId = "user-mock-id";
//         const mockUser = { id: mockUserId, email: params.email, name: "test user", username: "test" };

//         uniquePropertyService.getUniqueProperty.and.returnValue({ uniqueProperty: { userId: mockUserId } });
//         mockGetUserFunction.and.returnValue({ user: mockUser });

//         try {
//           const response = await userMediatorService.getUserByEmail(params);

//           expect(response).toEqual({ user: mockUser });
//           expect(uniquePropertyService.getUniqueProperty).toHaveBeenCalledTimes(1);
//           expect(uniquePropertyService.getUniqueProperty).toHaveBeenCalledWith({ property: UniqueProperty.Email, value: params.email });
//           expect(mockGetUserFunction).toHaveBeenCalledTimes(1);
//           expect(mockGetUserFunction).toHaveBeenCalledWith({ userId: mockUserId });
//         } catch (error: unknown) {
//           fail("Should have not failed");
//         }
//       });
//     });
//   });

//   describe("getUserByPhone", () => {
//     let mockGetUserFunction: jasmine.Spy;
//     beforeEach(() => {
//       mockGetUserFunction = spyOn(userMediatorService, "getUser");
//     });

//     describe("should fail correctly when", () => {
//       it("uniquePropertyService.getUniqueProperty errors", async () => {
//         const params: GetUserByPhoneInput = { phone: "+123456789" };
//         const mockError = new Error("Failed to continue");

//         uniquePropertyService.getUniqueProperty.and.throwError(mockError);

//         try {
//           await userMediatorService.getUserByPhone(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUserByPhone", { error, params }, userMediatorService.constructor.name);
//           expect(uniquePropertyService.getUniqueProperty).toHaveBeenCalledTimes(1);
//           expect(uniquePropertyService.getUniqueProperty).toHaveBeenCalledWith({ property: UniqueProperty.Phone, value: params.phone });
//           expect(error).toBe(mockError);
//         }
//       });

//       it("getUser errors", async () => {
//         const params: GetUserByPhoneInput = { phone: "+123456789" };
//         const mockUserId = "user-mock-id";
//         const mockError = new Error("Failed to continue");

//         uniquePropertyService.getUniqueProperty.and.returnValue({ uniqueProperty: { userId: mockUserId } });
//         mockGetUserFunction.and.throwError(mockError);

//         try {
//           await userMediatorService.getUserByPhone(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUserByPhone", { error, params }, userMediatorService.constructor.name);
//           expect(mockGetUserFunction).toHaveBeenCalledTimes(1);
//           expect(mockGetUserFunction).toHaveBeenCalledWith({ userId: mockUserId });
//           expect(error).toBe(mockError);
//         }
//       });
//     });
//     describe("successfully completes when", () => {
//       it("returns the found user", async () => {
//         const params: GetUserByPhoneInput = { phone: "+123456789" };
//         const mockUserId = "user-mock-id";
//         const mockUser = { id: mockUserId, phone: params.phone, name: "test user", username: "test" };

//         uniquePropertyService.getUniqueProperty.and.returnValue({ uniqueProperty: { userId: mockUserId } });
//         mockGetUserFunction.and.returnValue({ user: mockUser });

//         try {
//           const response = await userMediatorService.getUserByPhone(params);

//           expect(response).toEqual({ user: mockUser });
//           expect(uniquePropertyService.getUniqueProperty).toHaveBeenCalledTimes(1);
//           expect(uniquePropertyService.getUniqueProperty).toHaveBeenCalledWith({ property: UniqueProperty.Phone, value: params.phone });
//           expect(mockGetUserFunction).toHaveBeenCalledTimes(1);
//           expect(mockGetUserFunction).toHaveBeenCalledWith({ userId: mockUserId });
//         } catch (error: unknown) {
//           fail("Should have not failed");
//         }
//       });
//     });
//   });

//   describe("getUserByUsername", () => {
//     let mockGetUserFunction: jasmine.Spy;
//     beforeEach(() => {
//       mockGetUserFunction = spyOn(userMediatorService, "getUser");
//     });

//     describe("should fail correctly when", () => {
//       it("uniquePropertyService.getUniqueProperty errors", async () => {
//         const params: GetUserByUsernameInput = { username: "mock-user" };
//         const mockError = new Error("Failed to continue");

//         uniquePropertyService.getUniqueProperty.and.throwError(mockError);

//         try {
//           await userMediatorService.getUserByUsername(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUserByUsername", { error, params }, userMediatorService.constructor.name);
//           expect(uniquePropertyService.getUniqueProperty).toHaveBeenCalledTimes(1);
//           expect(uniquePropertyService.getUniqueProperty).toHaveBeenCalledWith({ property: UniqueProperty.Username, value: params.username });
//           expect(error).toBe(mockError);
//         }
//       });

//       it("getUser errors", async () => {
//         const params: GetUserByUsernameInput = { username: "mock-user" };
//         const mockUserId = "user-mock-id";
//         const mockError = new Error("Failed to continue");

//         uniquePropertyService.getUniqueProperty.and.returnValue({ uniqueProperty: { userId: mockUserId } });
//         mockGetUserFunction.and.throwError(mockError);

//         try {
//           await userMediatorService.getUserByUsername(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUserByUsername", { error, params }, userMediatorService.constructor.name);
//           expect(mockGetUserFunction).toHaveBeenCalledTimes(1);
//           expect(mockGetUserFunction).toHaveBeenCalledWith({ userId: mockUserId });
//           expect(error).toBe(mockError);
//         }
//       });
//     });
//     describe("successfully completes when", () => {
//       it("returns the found user", async () => {
//         const params: GetUserByUsernameInput = { username: "mock-user" };
//         const mockUserId = "user-mock-id";
//         const mockUser = { id: mockUserId, username: params.username, name: "test user", email: "mock@email.com" };

//         uniquePropertyService.getUniqueProperty.and.returnValue({ uniqueProperty: { userId: mockUserId } });
//         mockGetUserFunction.and.returnValue({ user: mockUser });

//         try {
//           const response = await userMediatorService.getUserByUsername(params);

//           expect(response).toEqual({ user: mockUser });
//           expect(uniquePropertyService.getUniqueProperty).toHaveBeenCalledTimes(1);
//           expect(uniquePropertyService.getUniqueProperty).toHaveBeenCalledWith({ property: UniqueProperty.Username, value: params.username });
//           expect(mockGetUserFunction).toHaveBeenCalledTimes(1);
//           expect(mockGetUserFunction).toHaveBeenCalledWith({ userId: mockUserId });
//         } catch (error: unknown) {
//           fail("Should have not failed");
//         }
//       });
//     });
//   });

//   describe("getOrCreateUserByEmail", () => {
//     let mockGetUserByEmailFunction: jasmine.Spy;
//     let mockCreateUserFunction: jasmine.Spy;

//     beforeEach(() => {
//       mockGetUserByEmailFunction = spyOn(userMediatorService, "getUserByEmail");
//       mockCreateUserFunction = spyOn(userMediatorService, "createUser");
//     });

//     describe("should fail correctly when", () => {
//       it("getUserByEmail and createUser errors", async () => {
//         const params: GetOrCreateUserByEmailInput = { email: "mock@mail.com" };
//         const mockError = new Error("Failed to continue");

//         mockGetUserByEmailFunction.and.throwError(new Error("nonce error"));
//         mockCreateUserFunction.and.throwError(mockError);

//         try {
//           await userMediatorService.getOrCreateUserByEmail(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getOrCreateUserByEmail", { error, params }, userMediatorService.constructor.name);
//           expect(mockGetUserByEmailFunction).toHaveBeenCalledTimes(1);
//           expect(mockGetUserByEmailFunction).toHaveBeenCalledWith({ email: params.email });
//           expect(mockCreateUserFunction).toHaveBeenCalledTimes(1);
//           expect(mockCreateUserFunction).toHaveBeenCalledWith({ email: params.email });
//           expect(error).toBe(mockError);
//         }
//       });
//     });
//     describe("successfully completes when", () => {
//       it("creates an user given an email", async () => {
//         const params: GetOrCreateUserByEmailInput = { email: "mock@mail.com" };
//         const mockError = new Error("Failed to continue");

//         const mockUserId = "user-mock-id";
//         const mockUser = { id: mockUserId, username: "testuser", name: "test user", email: "mock@email.com" };

//         mockGetUserByEmailFunction.and.throwError(mockError);
//         mockCreateUserFunction.and.returnValue({ user: mockUser });

//         try {
//           const response = await userMediatorService.getOrCreateUserByEmail(params);

//           expect(response).toEqual({ user: mockUser });
//           expect(mockGetUserByEmailFunction).toHaveBeenCalledTimes(1);
//           expect(mockGetUserByEmailFunction).toHaveBeenCalledWith({ email: params.email });
//           expect(mockCreateUserFunction).toHaveBeenCalledTimes(1);
//           expect(mockCreateUserFunction).toHaveBeenCalledWith({ email: params.email });
//         } catch (error: unknown) {
//           fail("Should have not failed");
//         }
//       });

//       it("finds an user given an email", async () => {
//         const params: GetOrCreateUserByEmailInput = { email: "mock@mail.com" };

//         const mockUserId = "user-mock-id";
//         const mockUser = { id: mockUserId, username: "testuser", name: "test user", email: "mock@email.com" };

//         mockGetUserByEmailFunction.and.returnValue({ user: mockUser });

//         try {
//           const response = await userMediatorService.getOrCreateUserByEmail(params);

//           expect(response).toEqual({ user: mockUser });
//           expect(mockGetUserByEmailFunction).toHaveBeenCalledTimes(1);
//           expect(mockGetUserByEmailFunction).toHaveBeenCalledWith({ email: params.email });
//           expect(mockCreateUserFunction).toHaveBeenCalledTimes(0);
//         } catch (error: unknown) {
//           fail("Should have not failed");
//         }
//       });
//     });
//   });

//   describe("getOrCreateUserByPhone", () => {
//     let mockGetUserByPhoneFunction: jasmine.Spy;
//     let mockCreateUserFunction: jasmine.Spy;

//     beforeEach(() => {
//       mockGetUserByPhoneFunction = spyOn(userMediatorService, "getUserByPhone");
//       mockCreateUserFunction = spyOn(userMediatorService, "createUser");
//     });

//     describe("should fail correctly when", () => {
//       it("getUserByUsername and createUser errors", async () => {
//         const params: GetOrCreateUserByPhoneInput = { phone: "+123456789" };
//         const mockError = new Error("Failed to continue");

//         mockGetUserByPhoneFunction.and.throwError(new Error("nonce error"));
//         mockCreateUserFunction.and.throwError(mockError);

//         try {
//           await userMediatorService.getOrCreateUserByPhone(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getOrCreateUserByPhone", { error, params }, userMediatorService.constructor.name);
//           expect(mockGetUserByPhoneFunction).toHaveBeenCalledTimes(1);
//           expect(mockGetUserByPhoneFunction).toHaveBeenCalledWith({ phone: params.phone });
//           expect(mockCreateUserFunction).toHaveBeenCalledTimes(1);
//           expect(mockCreateUserFunction).toHaveBeenCalledWith({ phone: params.phone });
//           expect(error).toBe(mockError);
//         }
//       });
//     });
//     describe("successfully completes when", () => {
//       it("creates an user given a `phone`", async () => {
//         const params: GetOrCreateUserByPhoneInput = { phone: "+123456789" };
//         const mockError = new Error("Failed to continue");

//         const mockUserId = "user-mock-id";
//         const mockUser = { id: mockUserId, username: "testuser", name: "test user", email: "mock@email.com" };

//         mockGetUserByPhoneFunction.and.throwError(mockError);
//         mockCreateUserFunction.and.returnValue({ user: mockUser });

//         try {
//           const response = await userMediatorService.getOrCreateUserByPhone(params);

//           expect(response).toEqual({ user: mockUser });
//           expect(mockGetUserByPhoneFunction).toHaveBeenCalledTimes(1);
//           expect(mockGetUserByPhoneFunction).toHaveBeenCalledWith({ phone: params.phone });
//           expect(mockCreateUserFunction).toHaveBeenCalledTimes(1);
//           expect(mockCreateUserFunction).toHaveBeenCalledWith({ phone: params.phone });
//         } catch (error: unknown) {
//           fail("Should have not failed");
//         }
//       });

//       it("finds an user given a `phone`", async () => {
//         const params: GetOrCreateUserByPhoneInput = { phone: "+123456789" };

//         const mockUserId = "user-mock-id";
//         const mockUser = { id: mockUserId, username: "testuser", name: "test user", email: "mock@email.com" };

//         mockGetUserByPhoneFunction.and.returnValue({ user: mockUser });

//         try {
//           const response = await userMediatorService.getOrCreateUserByPhone(params);

//           expect(response).toEqual({ user: mockUser });
//           expect(mockGetUserByPhoneFunction).toHaveBeenCalledTimes(1);
//           expect(mockGetUserByPhoneFunction).toHaveBeenCalledWith({ phone: params.phone });
//           expect(mockCreateUserFunction).toHaveBeenCalledTimes(0);
//         } catch (error: unknown) {
//           fail("Should have not failed");
//         }
//       });
//     });
//   });

//   describe("getUsersByTeamId", () => {
//     describe("should fail correctly when", () => {
//       it("teamUserRelationshipService.getTeamUserRelationshipsByTeamId errors", async () => {
//         const params: GetUsersByTeamIdInput = { teamId: "team-mock-id", exclusiveStartKey: "mock-random-key", limit: 10 };
//         const mockError = new Error("Failed to continue");

//         teamUserRelationshipService.getTeamUserRelationshipsByTeamId.and.throwError(mockError);

//         try {
//           await userMediatorService.getUsersByTeamId(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUsersByTeamId", { error, params }, userMediatorService.constructor.name);
//           expect(teamUserRelationshipService.getTeamUserRelationshipsByTeamId).toHaveBeenCalledTimes(1);
//           expect(teamUserRelationshipService.getTeamUserRelationshipsByTeamId).toHaveBeenCalledWith({ teamId: params.teamId, exclusiveStartKey: params.exclusiveStartKey, limit: params.limit });
//           expect(error).toBe(mockError);
//         }
//       });

//       it("userService.getUsers errors", async () => {
//         const params: GetUsersByTeamIdInput = { teamId: "team-mock-id", exclusiveStartKey: "mock-random-key", limit: 10 };
//         const mockError = new Error("Failed to continue");

//         teamUserRelationshipService.getTeamUserRelationshipsByTeamId.and.returnValue({ teamUserRelationships: [ { userId: "mock1" }, { userId: "mock2" } ], lastEvaluatedKey: "mock-key" });
//         userService.getUsers.and.throwError(mockError);

//         try {
//           await userMediatorService.getUsersByTeamId(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUsersByTeamId", { error, params }, userMediatorService.constructor.name);
//           expect(userService.getUsers).toHaveBeenCalledTimes(1);
//           expect(userService.getUsers).toHaveBeenCalledWith({ userIds: [ "mock1", "mock2" ] });
//           expect(error).toBe(mockError);
//         }
//       });

//       it("imageFileService.getSignedUrl errors", async () => {
//         const params: GetUsersByTeamIdInput = { teamId: "team-mock-id", exclusiveStartKey: "mock-random-key", limit: 10 };
//         const mockError = new Error("Failed to continue");

//         teamUserRelationshipService.getTeamUserRelationshipsByTeamId.and.returnValue({ teamUserRelationships: [ { userId: "mock1" }, { userId: "mock2" } ], lastEvaluatedKey: "mock-key" });
//         userService.getUsers.and.returnValue({ users: [ { id: "mock-id", imageMimeType: ImageMimeType.Png }, { id: "mock-id2", imageMimeType: ImageMimeType.Bmp } ] });
//         imageFileService.getSignedUrl.and.throwError(mockError);

//         try {
//           await userMediatorService.getUsersByTeamId(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUsersByTeamId", { error, params }, userMediatorService.constructor.name);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledTimes(1);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "get",
//             entityType: EntityType.User,
//             entityId: "mock-id",
//             mimeType: ImageMimeType.Png,
//           });
//           expect(error).toBe(mockError);
//         }
//       });
//     });
//     describe("successfully completes when", () => {
//       it("finds and returns an array of user based on `teamId`", async () => {
//         const params: GetUsersByTeamIdInput = { teamId: "team-mock-id", exclusiveStartKey: "mock-random-key", limit: 10 };
//         const mockSignedUrl = "mock-signed-url";

//         teamUserRelationshipService.getTeamUserRelationshipsByTeamId.and.returnValue({ teamUserRelationships: [ { userId: "mock1", role: "mock1" }, { userId: "mock2", role: "mock2" } ], lastEvaluatedKey: "mock-key" });
//         userService.getUsers.and.returnValue({ users: [ { id: "mock-id", imageMimeType: ImageMimeType.Png }, { id: "mock-id2", imageMimeType: ImageMimeType.Bmp } ] });
//         imageFileService.getSignedUrl.and.returnValue({ signedUrl: mockSignedUrl });

//         try {
//           const res = await userMediatorService.getUsersByTeamId(params);
//           expect(res).toEqual({
//             lastEvaluatedKey: "mock-key",
//             users: [ {
//               id: "mock-id",
//               role: "mock1",
//               image: mockSignedUrl,
//             }, {
//               id: "mock-id2",
//               role: "mock2",
//               image: mockSignedUrl,
//             } ],
//           });
//           expect(teamUserRelationshipService.getTeamUserRelationshipsByTeamId).toHaveBeenCalledTimes(1);
//           expect(teamUserRelationshipService.getTeamUserRelationshipsByTeamId).toHaveBeenCalledWith({ teamId: params.teamId, exclusiveStartKey: params.exclusiveStartKey, limit: params.limit });
//           expect(userService.getUsers).toHaveBeenCalledTimes(1);
//           expect(userService.getUsers).toHaveBeenCalledWith({ userIds: [ "mock1", "mock2" ] });
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledTimes(2);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "get",
//             entityType: EntityType.User,
//             entityId: "mock-id",
//             mimeType: ImageMimeType.Png,
//           });
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "get",
//             entityType: EntityType.User,
//             entityId: "mock-id2",
//             mimeType: ImageMimeType.Bmp,
//           });
//         } catch (error: unknown) {
//           fail("Should have not failed");
//         }
//       });
//     });
//   });

//   describe("getUsersByGroupId", () => {
//     describe("should fail correctly when", () => {
//       it("conversationUserRelationshipService.getConversationUserRelationshipsByConversationId errors", async () => {
//         const params: GetUsersByGroupIdInput = { groupId: "convo-group-mock-id", exclusiveStartKey: "mock-random-key", limit: 10 };
//         const mockError = new Error("Failed to continue");

//         conversationUserRelationshipService.getConversationUserRelationshipsByConversationId.and.throwError(mockError);

//         try {
//           await userMediatorService.getUsersByGroupId(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUsersByGroupId", { error, params }, userMediatorService.constructor.name);
//           expect(conversationUserRelationshipService.getConversationUserRelationshipsByConversationId).toHaveBeenCalledTimes(1);
//           expect(conversationUserRelationshipService.getConversationUserRelationshipsByConversationId).toHaveBeenCalledWith({ conversationId: params.groupId, exclusiveStartKey: params.exclusiveStartKey, limit: params.limit });
//           expect(error).toBe(mockError);
//         }
//       });

//       it("userService.getUsers errors", async () => {
//         const params: GetUsersByGroupIdInput = { groupId: "convo-group-mock-id", exclusiveStartKey: "mock-random-key", limit: 10 };
//         const mockError = new Error("Failed to continue");

//         conversationUserRelationshipService.getConversationUserRelationshipsByConversationId.and.returnValue({ conversationUserRelationships: [ { userId: "mock1" }, { userId: "mock2" } ], lastEvaluatedKey: "mock-key" });
//         userService.getUsers.and.throwError(mockError);

//         try {
//           await userMediatorService.getUsersByGroupId(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUsersByGroupId", { error, params }, userMediatorService.constructor.name);
//           expect(userService.getUsers).toHaveBeenCalledTimes(1);
//           expect(userService.getUsers).toHaveBeenCalledWith({ userIds: [ "mock1", "mock2" ] });
//           expect(error).toBe(mockError);
//         }
//       });

//       it("imageFileService.getSignedUrl errors", async () => {
//         const params: GetUsersByGroupIdInput = { groupId: "convo-group-mock-id", exclusiveStartKey: "mock-random-key", limit: 10 };
//         const mockError = new Error("Failed to continue");

//         conversationUserRelationshipService.getConversationUserRelationshipsByConversationId.and.returnValue({ conversationUserRelationships: [ { userId: "mock1" }, { userId: "mock2" } ], lastEvaluatedKey: "mock-key" });
//         userService.getUsers.and.returnValue({ users: [ { id: "mock-id", imageMimeType: ImageMimeType.Png }, { id: "mock-id2", imageMimeType: ImageMimeType.Bmp } ] });
//         imageFileService.getSignedUrl.and.throwError(mockError);

//         try {
//           await userMediatorService.getUsersByGroupId(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUsersByGroupId", { error, params }, userMediatorService.constructor.name);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledTimes(1);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "get",
//             entityType: EntityType.User,
//             entityId: "mock-id",
//             mimeType: ImageMimeType.Png,
//           });
//           expect(error).toBe(mockError);
//         }
//       });
//     });
//     describe("successfully completes when", () => {
//       it("finds and returns an array of user based on `groupId`", async () => {
//         const params: GetUsersByGroupIdInput = { groupId: "convo-group-mock-id", exclusiveStartKey: "mock-random-key", limit: 10 };
//         const mockSignedUrl = "mock-signed-url";

//         conversationUserRelationshipService.getConversationUserRelationshipsByConversationId.and.returnValue({ conversationUserRelationships: [ { userId: "mock1", role: "mock1" }, { userId: "mock2", role: "mock2" } ], lastEvaluatedKey: "mock-key" });
//         userService.getUsers.and.returnValue({ users: [ { id: "mock-id", imageMimeType: ImageMimeType.Png }, { id: "mock-id2", imageMimeType: ImageMimeType.Bmp } ] });
//         imageFileService.getSignedUrl.and.returnValue({ signedUrl: mockSignedUrl });

//         try {
//           const res = await userMediatorService.getUsersByGroupId(params);
//           expect(res).toEqual({
//             lastEvaluatedKey: "mock-key",
//             users: [ {
//               id: "mock-id",
//               role: "mock1",
//               image: mockSignedUrl,
//             }, {
//               id: "mock-id2",
//               role: "mock2",
//               image: mockSignedUrl,
//             } ],
//           });
//           expect(conversationUserRelationshipService.getConversationUserRelationshipsByConversationId).toHaveBeenCalledTimes(1);
//           expect(conversationUserRelationshipService.getConversationUserRelationshipsByConversationId).toHaveBeenCalledWith({ conversationId: params.groupId, exclusiveStartKey: params.exclusiveStartKey, limit: params.limit });
//           expect(userService.getUsers).toHaveBeenCalledTimes(1);
//           expect(userService.getUsers).toHaveBeenCalledWith({ userIds: [ "mock1", "mock2" ] });
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledTimes(2);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "get",
//             entityType: EntityType.User,
//             entityId: "mock-id",
//             mimeType: ImageMimeType.Png,
//           });
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "get",
//             entityType: EntityType.User,
//             entityId: "mock-id2",
//             mimeType: ImageMimeType.Bmp,
//           });
//         } catch (error: unknown) {
//           console.log({ error });
//           fail("Should have not failed");
//         }
//       });
//     });
//   });

//   describe("getUsersByMeetingId", () => {
//     describe("should fail correctly when", () => {
//       it("conversationUserRelationshipService.getConversationUserRelationshipsByConversationId errors", async () => {
//         const params: GetUsersByMeetingIdInput = { meetingId: "convo-meeting-mock-id", exclusiveStartKey: "mock-random-key", limit: 10 };
//         const mockError = new Error("Failed to continue");

//         conversationUserRelationshipService.getConversationUserRelationshipsByConversationId.and.throwError(mockError);

//         try {
//           await userMediatorService.getUsersByMeetingId(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUsersByMeetingId", { error, params }, userMediatorService.constructor.name);
//           expect(conversationUserRelationshipService.getConversationUserRelationshipsByConversationId).toHaveBeenCalledTimes(1);
//           expect(conversationUserRelationshipService.getConversationUserRelationshipsByConversationId).toHaveBeenCalledWith({ conversationId: params.meetingId, exclusiveStartKey: params.exclusiveStartKey, limit: params.limit });
//           expect(error).toBe(mockError);
//         }
//       });

//       it("userService.getUsers errors", async () => {
//         const params: GetUsersByMeetingIdInput = { meetingId: "convo-meeting-mock-id", exclusiveStartKey: "mock-random-key", limit: 10 };
//         const mockError = new Error("Failed to continue");

//         conversationUserRelationshipService.getConversationUserRelationshipsByConversationId.and.returnValue({ conversationUserRelationships: [ { userId: "mock1" }, { userId: "mock2" } ], lastEvaluatedKey: "mock-key" });
//         userService.getUsers.and.throwError(mockError);

//         try {
//           await userMediatorService.getUsersByMeetingId(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUsersByMeetingId", { error, params }, userMediatorService.constructor.name);
//           expect(userService.getUsers).toHaveBeenCalledTimes(1);
//           expect(userService.getUsers).toHaveBeenCalledWith({ userIds: [ "mock1", "mock2" ] });
//           expect(error).toBe(mockError);
//         }
//       });

//       it("imageFileService.getSignedUrl errors", async () => {
//         const params: GetUsersByMeetingIdInput = { meetingId: "convo-meeting-mock-id", exclusiveStartKey: "mock-random-key", limit: 10 };
//         const mockError = new Error("Failed to continue");

//         conversationUserRelationshipService.getConversationUserRelationshipsByConversationId.and.returnValue({ conversationUserRelationships: [ { userId: "mock1" }, { userId: "mock2" } ], lastEvaluatedKey: "mock-key" });
//         userService.getUsers.and.returnValue({ users: [ { id: "mock-id", imageMimeType: ImageMimeType.Png }, { id: "mock-id2", imageMimeType: ImageMimeType.Bmp } ] });
//         imageFileService.getSignedUrl.and.throwError(mockError);

//         try {
//           await userMediatorService.getUsersByMeetingId(params);
//           fail("Should have not continue");
//         } catch (error: unknown) {
//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in getUsersByMeetingId", { error, params }, userMediatorService.constructor.name);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledTimes(1);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "get",
//             entityType: EntityType.User,
//             entityId: "mock-id",
//             mimeType: ImageMimeType.Png,
//           });
//           expect(error).toBe(mockError);
//         }
//       });
//     });
//     describe("successfully completes when", () => {
//       it("finds and returns an array of user based on `meetingId`", async () => {
//         const params: GetUsersByMeetingIdInput = { meetingId: "convo-meeting-mock-id", exclusiveStartKey: "mock-random-key", limit: 10 };
//         const mockSignedUrl = "mock-signed-url";

//         conversationUserRelationshipService.getConversationUserRelationshipsByConversationId.and.returnValue({ conversationUserRelationships: [ { userId: "mock1", role: "mock1" }, { userId: "mock2", role: "mock2" } ], lastEvaluatedKey: "mock-key" });
//         userService.getUsers.and.returnValue({ users: [ { id: "mock-id", imageMimeType: ImageMimeType.Png }, { id: "mock-id2", imageMimeType: ImageMimeType.Bmp } ] });
//         imageFileService.getSignedUrl.and.returnValue({ signedUrl: mockSignedUrl });

//         try {
//           const res = await userMediatorService.getUsersByMeetingId(params);
//           expect(res).toEqual({
//             lastEvaluatedKey: "mock-key",
//             users: [ {
//               id: "mock-id",
//               role: "mock1",
//               image: mockSignedUrl,
//             }, {
//               id: "mock-id2",
//               role: "mock2",
//               image: mockSignedUrl,
//             } ],
//           });
//           expect(conversationUserRelationshipService.getConversationUserRelationshipsByConversationId).toHaveBeenCalledTimes(1);
//           expect(conversationUserRelationshipService.getConversationUserRelationshipsByConversationId).toHaveBeenCalledWith({ conversationId: params.meetingId, exclusiveStartKey: params.exclusiveStartKey, limit: params.limit });
//           expect(userService.getUsers).toHaveBeenCalledTimes(1);
//           expect(userService.getUsers).toHaveBeenCalledWith({ userIds: [ "mock1", "mock2" ] });
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledTimes(2);
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "get",
//             entityType: EntityType.User,
//             entityId: "mock-id",
//             mimeType: ImageMimeType.Png,
//           });
//           expect(imageFileService.getSignedUrl).toHaveBeenCalledWith({
//             operation: "get",
//             entityType: EntityType.User,
//             entityId: "mock-id2",
//             mimeType: ImageMimeType.Bmp,
//           });
//         } catch (error: unknown) {
//           fail("Should have not failed");
//         }
//       });
//     });
//   });
// });
