// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, AuthServiceDeleteClientResponseBody, ValidationServiceV2Interface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ClientServiceInterface } from "../services/client.service";
import { DeleteClientDto } from "../dtos/deleteClient.dto";
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

      const { clientId, clientSecret } = await this.clientService.createClient({ name, redirectUri, type, scopes });

      const response = {
        clientId,
        clientSecret,
        name,
        type,
        redirectUri,
        scopes,
      };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in createClient", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async deleteClient(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("deleteClient called", { request }, this.constructor.name);

      const {
        pathParameters: { clientId },
        headers: { "client-secret": clientSecret },
      } = this.validationService.validate({ dto: DeleteClientDto, request });

      await this.clientService.deleteClient({ clientId, clientSecret });

      const response: AuthServiceDeleteClientResponseBody = { message: "Client deleted." };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteClient", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface ClientControllerInterface {
  createClient(request: Request): Promise<Response>;
  deleteClient(request: Request): Promise<Response>;
}
