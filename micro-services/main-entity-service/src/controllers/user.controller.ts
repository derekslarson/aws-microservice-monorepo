// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ValidationServiceInterface, LoggerServiceInterface, Request, Response, RequestPortion, ForbiddenError } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { UserServiceInterface } from "../services/user.service";
import { UsersGetByTeamIdPathParametersDto } from "../dtos/users.getByTeamId.dto";
import { TeamUserMediatorServiceInterface } from "../mediator-services/team.user.mediator.service";
import { UserGetPathParametersDto } from "../dtos/user.get.dto";

@injectable()
export class UserController extends BaseController implements UserControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceInterface) private validationService: ValidationServiceInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamUserMediatorServiceInterface) private teamUserMediatorService: TeamUserMediatorServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
  ) {
    super();
  }

  public async getUsersByTeamId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUsersByTeamId called", { request }, this.constructor.name);

      const authUserId = this.getUserIdFromRequestWithJwt(request);

      const { teamId } = await this.validationService.validate(UsersGetByTeamIdPathParametersDto, RequestPortion.PathParameters, request.pathParameters);

      const { isTeamMember } = await this.teamUserMediatorService.isTeamMember({ teamId, userId: authUserId });

      if (!isTeamMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { users, lastEvaluatedKey } = await this.teamUserMediatorService.getUsersByTeamId({ teamId });

      return this.generateSuccessResponse({ users, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getUser(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUser called", { request }, this.constructor.name);

      const { userId } = await this.validationService.validate(UserGetPathParametersDto, RequestPortion.PathParameters, request.pathParameters);

      const { user } = await this.userService.getUser({ userId });

      return this.generateSuccessResponse({ user });
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface UserControllerInterface {
  getUsersByTeamId(request: Request): Promise<Response>;
  getUser(request: Request): Promise<Response>;
}
