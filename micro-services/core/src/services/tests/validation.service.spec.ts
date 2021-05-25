/* eslint-disable @typescript-eslint/unbound-method */
import { ValidationError } from "class-validator";
import { Spied, TestSupport } from "../../test-support";
import { ValidationService, ValidationServiceInterface } from "../validation.service";
import { LoggerService } from "../logger.service";
import { ClassValidator, ClassValidatorFactory } from "../../factories/classValidator.factory";
import { ClassTransformer, ClassTransformerFactory } from "../../factories/classTransformer.factory";
import { RequestPortion } from "../../enums/request.portion.enum";
import { BadRequestError } from "../../errors/badRequest.error";
import { RequestValidationError } from "../../errors/request.validation.error";

describe("ValidationService", () => {
  let classTransformer: ClassTransformer;
  let classValidator: ClassValidator;
  let loggerService: Spied<LoggerService>;
  let validationService: ValidationServiceInterface;

  const classTransformerFactory: ClassTransformerFactory = () => classTransformer;
  const classValidatorFactory: ClassValidatorFactory = () => classValidator;

  class MockDtoConstructor {
    public a: string;

    public b: number;
  }

  const mockRequestPortion = RequestPortion.Body;
  const mockStringValidationObject = '{ "a": "test", "b": 1, "c": [] }';
  const mockValidationObject = { a: "foo", b: 2, c: [ "bar" ] };
  const mockTransformation = { a: "test", b: 1 };
  const mockValidationSuccessResponse: ValidationError[] = [];
  const mockValidationErrorResponse: ValidationError[] = [
    {
      property: "test",
      value: "pants",
      constraints: { a: "this is a test" },
      children: [
        {
          property: "foo",
          value: "bar",
          constraints: { b: "testing 1 2 3" },
          children: [],
        },
      ],
    },
  ];

  beforeEach(() => {
    classTransformer = jasmine.createSpy("classTransformer").and.returnValue(mockTransformation);
    classValidator = jasmine.createSpy("classValidator").and.returnValue(Promise.resolve(mockValidationSuccessResponse));
    spyOn(JSON, "parse").and.callThrough();
    loggerService = TestSupport.spyOnClass(LoggerService);
    validationService = new ValidationService(classTransformerFactory, classValidatorFactory, loggerService);
  });

  describe("validate", () => {
    describe("under normal conditions", () => {
      it("calls classValidator with the correct parameters", async () => {
        await validationService.validate(MockDtoConstructor, mockRequestPortion, mockValidationObject);

        expect(classValidator).toHaveBeenCalledTimes(1);
        // For some reason this is is picking up an incorrect typing because the function has two signatures
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(classValidator).toHaveBeenCalledWith(mockTransformation);
      });

      it("returns the transformation", async () => {
        const result = await validationService.validate(MockDtoConstructor, mockRequestPortion, mockValidationObject);

        expect(result).toBe(mockTransformation);
      });

      describe("When passed an object as the validationObject", () => {
        it("doesn't call JSON.parse", async () => {
          await validationService.validate(MockDtoConstructor, mockRequestPortion, mockValidationObject);

          expect(JSON.parse).not.toHaveBeenCalled();
        });

        it("calls classTransformer with the correct parameters", async () => {
          await validationService.validate(MockDtoConstructor, mockRequestPortion, mockValidationObject);

          expect(classTransformer).toHaveBeenCalledTimes(1);
          expect(classTransformer).toHaveBeenCalledWith(MockDtoConstructor, mockValidationObject, { excludeExtraneousValues: true });
        });
      });

      describe("when passed a JSON string as the validationObject", () => {
        it("calls JSON.parse with the correct parameters", async () => {
          await validationService.validate(MockDtoConstructor, mockRequestPortion, mockStringValidationObject);

          expect(JSON.parse).toHaveBeenCalledTimes(1);
          expect(JSON.parse).toHaveBeenCalledWith(mockStringValidationObject);
        });

        it("calls classTransformer with the correct parameters", async () => {
          await validationService.validate(MockDtoConstructor, mockRequestPortion, mockStringValidationObject);

          expect(classTransformer).toHaveBeenCalledTimes(1);
          expect(classTransformer).toHaveBeenCalledWith(MockDtoConstructor, JSON.parse(mockStringValidationObject), { excludeExtraneousValues: true });
        });
      });
    });

    describe("under error conditions", () => {
      describe("When passed a falsy validationObject", () => {
        it("throws a BadRequestError with the correct message", async () => {
          try {
            await validationService.validate(MockDtoConstructor, mockRequestPortion, "");

            fail("Should have thrown");
          } catch (error: unknown) {
            expect(error).toBeInstanceOf(BadRequestError);
            expect((error as BadRequestError).message).toBe(`${mockRequestPortion} ${mockRequestPortion === RequestPortion.Body ? "is" : "are"} required.`);
          }
        });
      });

      describe("When classValidator returns validation errors", () => {
        beforeEach(() => {
          classValidator = jasmine.createSpy("classValidator").and.returnValue(Promise.resolve(mockValidationErrorResponse));
          validationService = new ValidationService(classTransformerFactory, classValidatorFactory, loggerService);
        });

        const expectedValidationErrors = [
          {
            property: mockValidationErrorResponse[0].property,
            value: mockValidationErrorResponse[0].value as string,
            issues: Object.values(mockValidationErrorResponse[0].constraints as Record<string, string>),
          },
          {
            property: `${mockValidationErrorResponse[0].property}.${mockValidationErrorResponse[0].children[0].property}`,
            value: mockValidationErrorResponse[0].children[0].value as string,
            issues: Object.values(mockValidationErrorResponse[0].children[0].constraints as Record<string, string>),
          },
        ];

        it("throws a RequestValidationError with the correct message and structure", async () => {
          try {
            await validationService.validate(MockDtoConstructor, mockRequestPortion, mockStringValidationObject);

            fail("Should have thrown");
          } catch (error: unknown) {
            expect(error).toBeInstanceOf(RequestValidationError);
            expect((error as RequestValidationError).message).toBe(`Error validating ${mockRequestPortion}.`);
            expect((error as RequestValidationError).validationErrors).toEqual(expectedValidationErrors);
          }
        });
      });
    });
  });
});
