import * as jose from "node-jose";

export type Jose = typeof jose;

export type JoseFactory = () => Jose;

export const joseFactory: JoseFactory = () => jose;
