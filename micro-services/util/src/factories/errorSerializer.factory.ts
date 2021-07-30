import errorSerializer from "serialize-error";

export type ErrorSerializer = typeof errorSerializer;

export type ErrorSerializerFactory = () => ErrorSerializer;

export const errorSerializerFactory: ErrorSerializerFactory = (): ErrorSerializer => errorSerializer;
