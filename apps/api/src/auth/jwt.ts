import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config.js";

export interface SessionToken {
  sub: string;
  householdId: string;
  role: string;
}

export const signSession = (payload: SessionToken) => {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, config.jwt.secret, options);
};

export const verifySession = (token: string): SessionToken =>
  jwt.verify(token, config.jwt.secret) as SessionToken;
