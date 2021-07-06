import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { AddUserAsFriendDto } from "../dtos/addUserAsFriend.dto";
import { FriendshipMediatorService } from "../mediator-services/friendship.mediator.service";
import { RemoveUserAsFriendDto } from "../dtos/removeUserAsFriend.dto";
import { GetFriendsByuserIdDto } from "../dtos/getFriendsByUserId.dto";

@injectable()
export class FriendController extends BaseController implements FriendControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private friendshipService: FriendshipMediatorService,
  ) {
    super();
  }

  public async addUserAsFriend(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("addUserAsFriend called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        body: { friendId },
      } = this.validationService.validate({ dto: AddUserAsFriendDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { friendship } = await this.friendshipService.createFriendship({ members: [ userId, friendId ] });

      return this.generateCreatedResponse({ friendship });
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserAsFriend", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async removeUserAsFriend(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("removeUserAsFriend called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId, friendId },
      } = this.validationService.validate({ dto: RemoveUserAsFriendDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      await this.friendshipService.deleteFriendship({ members: [ userId, friendId ] });

      return this.generateSuccessResponse({ message: "User removed as friend" });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserAsFriend", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getFriendsByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getFriendsByUserId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
      } = this.validationService.validate({ dto: GetFriendsByuserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { friends } = await this.friendshipService.getFriendsByUserId({ userId });

      return this.generateSuccessResponse({ friends });
    } catch (error: unknown) {
      this.loggerService.error("Error in getFriendsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface FriendControllerInterface {
  addUserAsFriend(request: Request): Promise<Response>;
  removeUserAsFriend(request: Request): Promise<Response>;
  getFriendsByUserId(request: Request): Promise<Response>;
}
