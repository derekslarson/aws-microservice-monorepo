import rmfr from "rmfr";
import fs from "fs";

export const fsWithRmfr = {
  ...fs,
  rmfr,
};

export type Fs = typeof fsWithRmfr;

export type FsFactory = () => Fs;

export const fsFactory: FsFactory = () => fsWithRmfr;
