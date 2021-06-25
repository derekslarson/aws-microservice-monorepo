// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ValidationServiceInterface, LoggerServiceInterface, Request, Response, RequestPortion, ForbiddenError } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { UserServiceInterface } from "../services/user.service";
import { TeamsGetByUserIdPathParametersInputDto } from "../models/teams.getByUserId.input.model";

@injectable()
export class UserController extends BaseController implements UserControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceInterface) private validationService: ValidationServiceInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
  ) {
    super();
  }

  public async getTeamsByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getTeamsByUserId called", { request }, this.constructor.name);

      const authUserId = this.getUserIdFromRequestWithJwt(request);

      const { userId } = await this.validationService.validate(TeamsGetByUserIdPathParametersInputDto, RequestPortion.PathParameters, request.pathParameters);

      if (authUserId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const teams = await this.userService.getTeamsByUserId(userId);

      return this.generateSuccessResponse({ teams });
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface UserControllerInterface {
  getTeamsByUserId(request: Request): Promise<Response>;
}
