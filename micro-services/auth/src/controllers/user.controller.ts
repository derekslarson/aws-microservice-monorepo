// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, UnauthorizedError } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { UserRepositoryInterface } from "../repositories/user.dynamo.repository";

@injectable()
export class UserController extends BaseController implements UserControllerInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserRepositoryInterface) private userRepository: UserRepositoryInterface,
  ) {
    super();
  }

  public async getUserInfo(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUserInfo called", { request }, this.constructor.name);

      const userId = request.requestContext.authorizer?.lambda?.userId;
      const scope = request.requestContext.authorizer?.lambda?.scope;

      if (!userId || !scope) {
        throw new UnauthorizedError("Unauthorized");
      }

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
