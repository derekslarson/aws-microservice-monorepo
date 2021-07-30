import ksuid from "ksuid";

export type Ksuid = typeof ksuid;

export type KsuidFactory = () => typeof ksuid;

export const ksuidFactory: KsuidFactory = (): Ksuid => ksuid;
