// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ValidationServiceInterface, LoggerServiceInterface, Request, Response, CreateClientResponseBody, RequestPortion, DeleteClientResponseBody } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { CreateClientInputDto } from "../models/client/client.creation.input.model";
import { ClientServiceInterface } from "../services/client.service";
import { DeleteClientInputDto } from "../models/client/client.deletion.input.model";

@injectable()
export class ClientController extends BaseController implements ClientControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceInterface) private validationService: ValidationServiceInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ClientServiceInterface) private clientService: ClientServiceInterface,
  ) {
    super();
  }

  public async createClient(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createClient called", { request }, this.constructor.name);

      const createClientInput = await this.validationService.validate(CreateClientInputDto, RequestPortion.Body, request.body);

      const { clientId, clientSecret } = await this.clientService.createClient(createClientInput);

      const response: CreateClientResponseBody = {
        clientId,
        clientSecret,
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

      const { id = "" } = request.pathParameters || {};

      const { secret } = await this.validationService.validate(DeleteClientInputDto, RequestPortion.Headers, request.headers);

      await this.clientService.deleteClient(id, secret);

      const response: DeleteClientResponseBody = { message: "Client deleted" };

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
