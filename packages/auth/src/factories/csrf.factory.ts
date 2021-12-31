import CsrfClass from "csrf";

export type Csrf = CsrfClass;

export type CsrfFactory = () => Csrf;

export const csrfFactory: CsrfFactory = () => new CsrfClass();
