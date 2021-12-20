// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController } from "@yac/util/src/controllers/base.controller";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { ValidationServiceV2Interface } from "@yac/util/src/services/validation.service.v2";
import { Request } from "@yac/util/src/models/http/request.model";
import { Response } from "@yac/util/src/models/http/response.model";
import { TYPES } from "../inversion-of-control/types";
import { ClientServiceInterface } from "../services/tier-1/client.service";
import { CreateClientDto } from "../dtos/createClient.dto";

@injectable()
export class ClientController extends BaseController implements ClientControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ClientServiceInterface) private clientService: ClientServiceInterface,
  ) {
    super();
  }

  public async createClient(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createClient called", { request }, this.constructor.name);

      const { body: { name, redirectUri, type, scopes } } = this.validationService.validate({ dto: CreateClientDto, request });

      const { client } = await this.clientService.createClient({ name, redirectUri, type, scopes });

      const response = { client };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in createClient", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface ClientControllerInterface {
  createClient(request: Request): Promise<Response>;
}
