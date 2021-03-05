import "reflect-metadata";
import { injectable, inject } from "inversify";
import { ValidationError } from "class-validator";
import { TYPES } from "../inversion-of-control/types";
import { LoggerServiceInterface } from "./logger.service";
import { ClassTransformer, ClassTransformerFactory } from "../factories/classTransformer.factory";
import { ClassValidator, ClassValidatorFactory } from "../factories/classValidator.factory";
import { BadRequestError } from "../errors/badRequest.error";

@injectable()
export class ValidationService implements ValidationServiceInterface {
  private classTransformer: ClassTransformer;

  private classValidator: ClassValidator;

  constructor(
  @inject(TYPES.ClassTransformerFactory) classTransformerFactory: ClassTransformerFactory,
    @inject(TYPES.ClassValidatorFactory) classValidatorFactory: ClassValidatorFactory,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) {
    this.classTransformer = classTransformerFactory();
    this.classValidator = classValidatorFactory();
  }

  public async validate<T>(dtoConstructor: { new (): T }, validationObject?: string | Record<string, unknown>): Promise<T> {
    try {
      this.loggerService.trace("validate called", { dtoConstructor: dtoConstructor.name, validationObject }, this.constructor.name);

      if (!validationObject) {
        throw new BadRequestError("Request body is required.");
      }

      let parsedValidationObject: Record<string, unknown>;

      if (typeof validationObject === "string") {
        parsedValidationObject = JSON.parse(validationObject) as Record<string, unknown>;
      } else {
        parsedValidationObject = validationObject;
      }

      const transformation = this.classTransformer(dtoConstructor, parsedValidationObject, { excludeExtraneousValues: true });

      (Object.keys(transformation) as Array<keyof T>).forEach((key) => transformation[key] === undefined && delete transformation[key]);

      const validationErrors = await this.classValidator(transformation);

      if (validationErrors.length) {
        const validationErrorMessage = this.generateValidationErrorMessage(validationErrors);

        throw new BadRequestError(validationErrorMessage);
      }

      return transformation;
    } catch (error: unknown) {
      this.loggerService.error("Error in validate", { error, dtoConstructor, validationObject }, this.constructor.name);

      const errorMessage = (error as Error).message;

      throw new BadRequestError(errorMessage);
    }
  }

  private generateValidationErrorMessage(validationErrors: ValidationError[]): string {
    try {
      this.loggerService.trace("generateValidationErrorMessage called", { validationErrors }, this.constructor.name);

      return validationErrors.reduce((acc, validationError) => {
        const constraints = validationError.constraints ? Object.values(validationError.constraints) : [];
        const constraintMessages = [ acc, ...constraints ];

        if (validationError.children.length) {
          const childrenConstraintMessages = this.generateValidationErrorMessage(validationError.children);

          constraintMessages.push(...childrenConstraintMessages);
        }

        return constraintMessages.filter((message) => message).join(", ");
      }, "");
    } catch (error: unknown) {
      this.loggerService.trace("Error in generateValidationErrorMessage", { error, validationErrors }, this.constructor.name);

      throw error;
    }
  }
}

export interface ValidationServiceInterface {
  validate<T>(dtoConstructor: { new (): T }, validationObject?: string | Record<string, unknown>): Promise<T>
}
