// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ValidationServiceInterface, LoggerServiceInterface, Request, Response, RequestPortion, ForbiddenError } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { UsersGetByTeamIdPathParametersInputDto } from "../models/user/users.getByTeamId.input.model";
import { TeamServiceInterface } from "../services/team.service";
import { UserServiceInterface } from "../services/user.service";

@injectable()
export class UserController extends BaseController implements UserControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceInterface) private validationService: ValidationServiceInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.TeamServiceInterface) private userService: UserServiceInterface,
  ) {
    super();
  }

  public async getUsersByTeamId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUsersByTeamId called", { request }, this.constructor.name);

      const authUserId = this.getUserIdFromRequestWithJwt(request);

      const { teamId } = await this.validationService.validate(UsersGetByTeamIdPathParametersInputDto, RequestPortion.PathParameters, request.pathParameters);

      const isTeamMember = await this.teamService.isTeamMember(teamId, authUserId);

      if (!isTeamMember) {
        throw new ForbiddenError("Forbidden");
      }

      const users = await this.userService.getUsersByTeamId(teamId);

      return this.generateSuccessResponse({ users });
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface UserControllerInterface {
  getUsersByTeamId(request: Request): Promise<Response>;
}
