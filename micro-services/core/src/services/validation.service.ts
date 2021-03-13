import "reflect-metadata";
import { injectable, inject } from "inversify";
import { ValidationError } from "class-validator";
import { TYPES } from "../inversion-of-control/types";
import { LoggerServiceInterface } from "./logger.service";
import { ClassTransformer, ClassTransformerFactory } from "../factories/classTransformer.factory";
import { ClassValidator, ClassValidatorFactory } from "../factories/classValidator.factory";
import { BadRequestError } from "../errors/badRequest.error";
import { RequestValidationError } from "../errors/request.validation.error";
import { RequestPortion } from "../enums/request.portion.enum";

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

  public async validate<T>(dtoConstructor: { new (): T }, requestPortion: RequestPortion, validationObject?: string | Record<string, unknown>): Promise<T> {
    try {
      this.loggerService.trace("validate called", { dtoConstructor: dtoConstructor.name, validationObject }, this.constructor.name);

      if (!validationObject) {
        throw new BadRequestError(`${requestPortion} ${requestPortion === RequestPortion.Body ? "is" : "are"} required.`);
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
        const handledValidationErrors = this.handleValidationErrors(validationErrors);

        throw new RequestValidationError(requestPortion, handledValidationErrors);
      }

      return transformation;
    } catch (error: unknown) {
      this.loggerService.error("Error in validate", { error, dtoConstructor, validationObject }, this.constructor.name);

      if (error instanceof RequestValidationError) {
        throw error;
      }

      const errorMessage = (error as Error).message;

      throw new BadRequestError(errorMessage);
    }
  }

  private handleValidationErrors(validationErrors: ValidationError[], parentPath = ""): { property: string, value: unknown, issues: string[]; }[] {
    try {
      this.loggerService.trace("handleValidationErrors called", { validationErrors }, this.constructor.name);

      const handledErrors: { property: string, value: unknown, issues: string[]; }[] = [];

      for (const validationError of validationErrors) {
        const property = parentPath ? `${parentPath}.${validationError.property}` : validationError.property;
        const issues = validationError.constraints ? Object.values(validationError.constraints) : [];

        const handledError: { property: string, value: unknown, issues: string[]; } = {
          property,
          value: validationError.value,
          issues,
        };

        handledErrors.push(handledError);

        if (validationError.children.length) {
          const handledChildren = this.handleValidationErrors(validationError.children, property);

          handledErrors.push(...handledChildren);
        }
      }

      return handledErrors;
    } catch (error: unknown) {
      this.loggerService.trace("Error in handleValidationErrors", { error, validationErrors }, this.constructor.name);

      throw error;
    }
  }
}

export interface ValidationServiceInterface {
  validate<T>(dtoConstructor: { new (): T }, requestPortion: RequestPortion, validationObject?: string | Record<string, unknown>): Promise<T>
}
