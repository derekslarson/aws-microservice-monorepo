import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ValidationServiceV2Interface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { UserServiceInterface } from "../services/user.service";
import { GetUserDto } from "../dtos/getUser.dto";

@injectable()
export class UserController extends BaseController implements UserControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
  ) {
    super();
  }

  public async getUser(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUser called", { request }, this.constructor.name);

      const { pathParameters: { userId } } = this.validationService.validate({ dto: GetUserDto, request, getUserIdFromJwt: true });

      const { user } = await this.userService.getUser({ userId });

      return this.generateSuccessResponse({ user });
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface UserControllerInterface {
  getUser(request: Request): Promise<Response>;
}
