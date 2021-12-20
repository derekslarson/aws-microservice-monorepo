import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface, Organization, WithRole } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { CreateOrganizationDto } from "../dtos/createOrganization.dto";
import { GetOrganizationDto } from "../dtos/getOrganization.dto";
import { AddUsersToOrganizationDto } from "../dtos/addUsersToOrganization.dto";
import { RemoveUserFromOrganizationDto } from "../dtos/removeUserFromOrganization.dto";
import { GetOrganizationsByUserIdDto } from "../dtos/getOrganizationsByUserId.dto";
import { GetOrganizationImageUploadUrlDto } from "../dtos/getOrganizationImageUploadUrl.dto";
import { UpdateOrganizationDto } from "../dtos/updateOrganization.dto";
import { OrganizationServiceInterface } from "../services/tier-1/organization.service";
import { AddUsersToOrganizationOutput, InvitationServiceInterface } from "../services/tier-2/invitation.service";

@injectable()
export class OrganizationController extends BaseController implements OrganizationControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OrganizationServiceInterface) private organizationService: OrganizationServiceInterface,
    @inject(TYPES.InvitationServiceInterface) private invitationService: InvitationServiceInterface,
  ) {
    super();
  }

  public async createOrganization(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createOrganization called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        body: { name },
      } = this.validationService.validate({ dto: CreateOrganizationDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { organization } = await this.organizationService.createOrganization({ name, createdBy: userId });

      const response: CreateOrganizationResponse = { organization };

      return this.generateCreatedResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in createOrganization", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async updateOrganization(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("updateOrganization called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { organizationId },
        body,
      } = this.validationService.validate({ dto: UpdateOrganizationDto, request, getUserIdFromJwt: true });

      const { isOrganizationAdmin } = await this.organizationService.isOrganizationAdmin({ organizationId, userId: jwtId });

      if (!isOrganizationAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.organizationService.updateOrganization({ organizationId, updates: body });

      const response: UpdateOrganizationResponse = { message: "Organization updated." };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateOrganization", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getOrganization(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getOrganization called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { organizationId },
      } = this.validationService.validate({ dto: GetOrganizationDto, request, getUserIdFromJwt: true });

      const { isOrganizationMember } = await this.organizationService.isOrganizationMember({ organizationId, userId: jwtId });

      if (!isOrganizationMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { organization } = await this.organizationService.getOrganization({ organizationId });

      const response: GetOrganizationResponse = { organization };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getOrganizationImageUploadUrl(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getOrganizationImageUploadUrl called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { organizationId },
        queryStringParameters: { mime_type: mimeType },
      } = this.validationService.validate({ dto: GetOrganizationImageUploadUrlDto, request, getUserIdFromJwt: true });

      const { isOrganizationAdmin } = await this.organizationService.isOrganizationAdmin({ organizationId, userId: jwtId });

      if (!isOrganizationAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { uploadUrl } = this.organizationService.getOrganizationImageUploadUrl({ organizationId, mimeType });

      const response: GetOrganizationImageUploadUrlResponse = { uploadUrl };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationImageUploadUrl", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async addUsersToOrganization(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("addUsersToOrganization called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { organizationId },
        body: { users },
      } = this.validationService.validate({ dto: AddUsersToOrganizationDto, request, getUserIdFromJwt: true });

      const { isOrganizationAdmin } = await this.organizationService.isOrganizationAdmin({ organizationId, userId: jwtId });

      if (!isOrganizationAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { successes, failures } = await this.invitationService.addUsersToOrganization({ organizationId, users });

      const response: AddUsersToOrganizationResponse = {
        message: `Users added to organization${failures.length ? ", but with some failures." : "."}`,
        successes,
        ...(failures.length && { failures }),
      };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToOrganization", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async removeUserFromOrganization(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("removeUserFromOrganization called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { organizationId, userId },
      } = this.validationService.validate({ dto: RemoveUserFromOrganizationDto, request, getUserIdFromJwt: true });

      const { isOrganizationAdmin } = await this.organizationService.isOrganizationAdmin({ organizationId, userId: jwtId });

      if (!isOrganizationAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.organizationService.removeUserFromOrganization({ organizationId, userId });

      const response: RemoveUserFromOrganizationResponse = { message: "User removed from organization." };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromOrganization", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getOrganizationsByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getOrganizationsByUserId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetOrganizationsByUserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { organizations, lastEvaluatedKey } = await this.organizationService.getOrganizationsByUserId({ userId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetOrganizationsByUserIdResponse = { organizations, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface OrganizationControllerInterface {
  createOrganization(request: Request): Promise<Response>;
  updateOrganization(request: Request): Promise<Response>;
  getOrganization(request: Request): Promise<Response>;
  addUsersToOrganization(request: Request): Promise<Response>;
  removeUserFromOrganization(request: Request): Promise<Response>;
  getOrganizationImageUploadUrl(request: Request): Promise<Response>;
  getOrganizationsByUserId(request: Request): Promise<Response>;
}

interface CreateOrganizationResponse {
  organization: Organization;
}

interface GetOrganizationResponse {
  organization: Organization;
}

interface GetOrganizationImageUploadUrlResponse {
  uploadUrl: string;
}

interface AddUsersToOrganizationResponse {
  message: string;
  successes?: AddUsersToOrganizationOutput["successes"];
  failures?: AddUsersToOrganizationOutput["failures"];
}

interface RemoveUserFromOrganizationResponse {
  message: string;
}
interface UpdateOrganizationResponse {
  message: "Organization updated.";
}

interface GetOrganizationsByUserIdResponse {
  organizations: WithRole<Organization>[];
  lastEvaluatedKey?: string;
}
