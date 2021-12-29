import path from "path";

export type Path = typeof path;

export type PathFactory = () => Path;

export const pathFactory: PathFactory = () => path;
