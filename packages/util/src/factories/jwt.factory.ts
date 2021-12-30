import jwt from "jsonwebtoken";

export type Jwt = typeof jwt;

export type JwtFactory = () => Jwt;

export const jwtFactory: JwtFactory = () => jwt;
