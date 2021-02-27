import { plainToClass } from "class-transformer";

export type ClassTransformer = typeof plainToClass;

export type ClassTransformerFactory = () => ClassTransformer;

export const classTransformerFactory: ClassTransformerFactory = (): ClassTransformer => plainToClass;
