import crypto from "crypto";
import { randomDigits } from "crypto-secure-random-digit";

const cryptoWithRandomDigits = {
  ...crypto,
  randomDigits,
};

export type Crypto = typeof cryptoWithRandomDigits;

export type CryptoFactory = () => Crypto;

export const cryptoFactory: CryptoFactory = () => cryptoWithRandomDigits;
