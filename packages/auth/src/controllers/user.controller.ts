// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController } from "@yac/util/src/controllers/base.controller";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { ValidationServiceV2Interface } from "@yac/util/src/services/validation.service.v2";
import { Request } from "@yac/util/src/models/http/request.model";
import { Response } from "@yac/util/src/models/http/response.model";
import { TYPES } from "../inversion-of-control/types";
import { UserRepositoryInterface } from "../repositories/user.dynamo.repository";
import { GetUserInfoDto } from "../dtos/getUserInfo.dto";

@injectable()
export class UserController extends BaseController implements UserControllerInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.UserRepositoryInterface) private userRepository: UserRepositoryInterface,
  ) {
    super();
  }

  public async getUserInfo(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUserInfo called", { request }, this.constructor.name);

      const { jwtId: userId, jwtScope: scope } = this.validationService.validate({ request, dto: GetUserInfoDto, getUserIdFromJwt: true });

      const { user } = await this.userRepository.getUser({ id: userId });

      const scopesSet = new Set(scope.split(" "));

      const response: Record<string, string | number> = { sub: user.id };

      if (scopesSet.has("email") && user.email) {
        response.email = user.email;
      }

      if (scopesSet.has("profile") && user.name) {
        response.name = user.name;
      }

      if (scopesSet.has("phone_number") && user.phone) {
        response.phone_number = user.phone;
      }

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getUserInfo", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface UserControllerInterface {
  getUserInfo(request: Request): Promise<Response>;
}
