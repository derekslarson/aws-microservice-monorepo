import jdenticon from "jdenticon";

export type Identicon = typeof jdenticon;

export type IdenticonFactory = () => Identicon;

export const identiconFactory: IdenticonFactory = () => jdenticon;
