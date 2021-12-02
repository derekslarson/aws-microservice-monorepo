import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, OrganizationId, UserId } from "@yac/util";
import { TYPES } from "../../inversion-of-control/types";
import { OrganizationAdminMappingRepositoryInterface } from "../../repositories/organizationAdminMapping.dynamo.repository";

@injectable()
export class OrganizationService implements OrganizationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OrganizationAdminMappingRepositoryInterface) private organizationAdminMappingRepository: OrganizationAdminMappingRepositoryInterface,
  ) {}

  public async isOrganizationAdmin(params: IsOrganizationAdminInput): Promise<IsOrganizationAdminOutput> {
    try {
      this.loggerService.trace("isOrganizationAdmin called", { params }, this.constructor.name);

      const { userId, organizationId } = params;

      try {
        await this.organizationAdminMappingRepository.getOrganizationAdminMapping({ userId, organizationId });

        return { isOrganizationAdmin: true };
      } catch (error) {
        if (error instanceof NotFoundError) {
          return { isOrganizationAdmin: false };
        }

        throw error;
      }
    } catch (error: unknown) {
      this.loggerService.error("Error in isOrganizationAdmin", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OrganizationServiceInterface {
  isOrganizationAdmin(params: IsOrganizationAdminInput): Promise<IsOrganizationAdminOutput>
}

export interface IsOrganizationAdminInput {
  userId: UserId;
  organizationId: OrganizationId;
}

export interface IsOrganizationAdminOutput {
  isOrganizationAdmin: boolean;
}
