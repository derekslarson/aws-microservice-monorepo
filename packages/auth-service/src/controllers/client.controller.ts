// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ValidationServiceInterface, LoggerServiceInterface, Request, Response, CreateClientResponseBody, RequestPortion } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { CreateClientInputDto } from "../models/client/client.creation.input.model";
import { ClientServiceInterface } from "../services/client.service";

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

      const { id, secret } = await this.clientService.createClient(createClientInput);

      const response: CreateClientResponseBody = {
        clientId: id,
        clientSecret: secret,
      };

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
