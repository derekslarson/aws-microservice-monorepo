import { validate } from "class-validator";

export type ClassValidator = typeof validate;

export type ClassValidatorFactory = () => ClassValidator;

export const classValidatorFactory: ClassValidatorFactory = (): ClassValidator => validate;
