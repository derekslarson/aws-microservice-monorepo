/* eslint-disable max-len */
import { inject, injectable } from "inversify";
import { ForbiddenError, LoggerServiceInterface } from "@yac/util";
import jwt from "jsonwebtoken";
import jwkToPem, { JWK } from "jwk-to-pem";
import axios from "axios";
import { TYPES } from "../inversion-of-control/types";
import { UserId } from "../types/userId.type";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class TokenVerificationService implements TokenVerificationServiceInterface {
  private jwksUrl: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: TokenVerificationServiceConfig,
  ) {
    this.jwksUrl = config.jwksUrl;
  }

  public async verifyToken(params: VerifyTokenInput): Promise<VerifyTokenOutput> {
    try {
      this.loggerService.trace("verifyToken called", { params }, this.constructor.name);

      const { token } = params;

      const { data: jwks } = await axios.get<{ keys:(JWK & { kid: string; })[] }>(this.jwksUrl);

      const { header: { kid } } = jwt.decode(token, { complete: true }) || { header: {} };

      const jwk = jwks.keys.find((key) => key.kid === kid);

      if (!jwk) {
        throw new ForbiddenError("Forbidden");
      }

      const pem = jwkToPem(jwk);

      const decodedToken = jwt.verify(token, pem, { algorithms: [ "RS256" ] }) as DecodedToken;

      return { decodedToken };
    } catch (error: unknown) {
      this.loggerService.error("Error in verifyToken", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

type TokenVerificationServiceConfig = Pick<EnvConfigInterface, "jwksUrl">;

export interface TokenVerificationServiceInterface {
  verifyToken(params: VerifyTokenInput): Promise<VerifyTokenOutput>;
}

export interface VerifyTokenInput {
  token: string;
}

export interface DecodedToken {
  username: UserId;
}

export interface VerifyTokenOutput {
  decodedToken: DecodedToken;
}

console.log(jwt.decode("eyJraWQiOiJMZ3dqWWRmQ1wvblgzN2RIeUNEZUtxbThNR0pmMlBrRE1RbE5SSXFNRXRvYz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI2MDYyOGUxZS01YjUxLTQzZTUtYjQ4NS05MWEwYzhkMzdjZDYiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9oR1pEUTlQc1YiLCJ2ZXJzaW9uIjoyLCJjbGllbnRfaWQiOiI2NmhrdGpyYWo1dW1sMzlycGg0dG9vYmlrbyIsIm9yaWdpbl9qdGkiOiIyMDYwODM3OC00ZjI4LTRkZTctYWU1OC1iNDA3Mzk4ZTA5ZDMiLCJldmVudF9pZCI6ImYyZjVlZjk5LWMzNTMtNDliNi1iZjkxLWMwYzIyZDExODY0MiIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoieWFjXC9tZWV0aW5nLndyaXRlIHlhY1wvbWVzc2FnZS5kZWxldGUgeWFjXC90ZWFtLndyaXRlIHlhY1wvY29udmVyc2F0aW9uLndyaXRlIHlhY1wvbWVldGluZ19tZW1iZXIuZGVsZXRlIHlhY1wvdGVhbV9tZW1iZXIud3JpdGUgeWFjXC9tZWV0aW5nLmRlbGV0ZSB5YWNcL2NvbnZlcnNhdGlvbi5kZWxldGUgeWFjXC9ncm91cC5kZWxldGUgeWFjXC9ncm91cF9tZW1iZXIuZGVsZXRlIHlhY1wvY29udmVyc2F0aW9uLnJlYWQgeWFjXC9ncm91cF9tZW1iZXIucmVhZCB5YWNcL21lZXRpbmcucmVhZCB5YWNcL3VzZXIucmVhZCB5YWNcL2ZyaWVuZC53cml0ZSB5YWNcL21lc3NhZ2Uud3JpdGUgeWFjXC9mcmllbmQuZGVsZXRlIHlhY1wvbWVzc2FnZS5yZWFkIHlhY1wvdGVhbS5kZWxldGUgeWFjXC9tZWV0aW5nX21lbWJlci5yZWFkIHlhY1wvdGVhbV9tZW1iZXIuZGVsZXRlIHlhY1wvZnJpZW5kLnJlYWQgeWFjXC90ZWFtX21lbWJlci5yZWFkIHlhY1wvbWVldGluZ19tZW1iZXIud3JpdGUgeWFjXC91c2VyLndyaXRlIHlhY1wvZ3JvdXAud3JpdGUgeWFjXC90ZWFtLnJlYWQgeWFjXC91c2VyLmRlbGV0ZSB5YWNcL2dyb3VwLnJlYWQgeWFjXC9ncm91cF9tZW1iZXIud3JpdGUiLCJhdXRoX3RpbWUiOjE2MjgwMDc1MTUsImV4cCI6MTYyODAxMTExNSwiaWF0IjoxNjI4MDA3NTE1LCJqdGkiOiIxODAzMGM3ZS0xZmZjLTQyOTMtOGYzOC05M2VhNzliODVlNWQiLCJ1c2VybmFtZSI6InVzZXItMXdBWXh5eDZtRjB0eFdDekNlMzJmUlFIdk5uIn0.RJkfYSE8mCqaJpl85rSZSJRIKcF9cyrnJZ205HN8gz0O2p6Km7W6UkrD-WNGpp95QI6z4k6U8jdMpKvNkGgGdj9aMLm3yaLuwL0Sw9_0ig9NaQuBt_b642t32hFkyiXuQ3PgsT5SdFuCVd9TA0sFbfHLeZYCt5VZyyIk3CK_E3Vpf-HqB8gFBLN9paNro-y2pTMPS1v0e6yVKiUxaUkyQY8UQR-jm_xrnrC-HlINKznK3VXB2FHfQeW_PP_a8DSIhVNzwwaw7vm9v7RlILwjbMpS4zdZBSF0lhMkIw0QMuYEZKCw5XywtgesbaCBukvImIu_EZROVtQtE2nYIXBGwA", { complete: true }));
