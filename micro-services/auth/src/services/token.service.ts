/* eslint-disable max-len */
import { inject, injectable } from "inversify";
import { ForbiddenError, IdServiceInterface, LoggerServiceInterface, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { Jose, JoseFactory } from "../factories/jose.factory";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class TokenService implements TokenServiceInterface {
  private jose: Jose;

  private keyStoreJson: string;

  private apiUrl: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: EnvConfigInterface,
    @inject(TYPES.JoseFactory) joseFactory: JoseFactory,
  ) {
    this.jose = joseFactory();
    this.keyStoreJson = '{"keys":[{"kty":"RSA","kid":"aoYHsYmpR_PHA9sMpyxjkOk_lDusZwj1mZ-wCZAq_VE","use":"sig","alg":"RS256","e":"AQAB","n":"yWTfMFdQmye3sb1lkT4d82R7jDwno0X6nNlDAvdXdickyzA_ts2m26VVJ4sG-jz8doOv0u5QD_UQENUAwZtz_6airHIuc4bTduBpwKrgEWf6Ke-wKWQGKtDSMpbWIcp6bOaS0w3BLPrQGqN2vDcZ1CqwomAhsQ1bx7ayENLf-hfxzsDLFYs3yln4ZT7tDKpsIBdKB1GsC5fWaYLZ3jN6CqGRu4XBZptvN-hUXNOh-6KjN9cCsvxR-Gdy2mfJ3lU9rrl_-wekXfJ0HEHIwD167gk_jUJERhULB5jD5Q2HdykFfWWMIdeO2MQvM0Jk1JiSCm-CvoBmOI4anH54Nt9U9w","d":"lYQVCt-YEUiAYS2aTSVPuRYdfzRdvSLD91R5IqecwDQ5ZbxRYRb2zNTHDo9xw7ApQpdrnm6c8-vdXJG2eQY_LUp6NQqkH9K2Beh_urFhnqqSGDZBk8kVpw3XMAW5veaD03uu_4-TniArBcvb58oEm_aBols6SCcBv5iMRF86N4HjKESHDM2IKIfMzcpZ8aMgctszrDHWoTYvhSyfxShImDA7OxXn0Vs_c3FI5XgYUugJQNwr6AuTxM4qimdrwm4sfiHlCLye4EAbYjaabhayGHWSwpw0iV0O5zgIfgIdvdW4BYFutRt_OmTvI4hiClYbp7erMsHAQXuj1uHcABBTwQ","p":"9cPOznPcdUlwoHsMeVnJe5atV6BJNzfNXtVXei77gHQ67TwS8dIdIjoU1tw87aKy8NuiXslCSyndAzY5UEDfpSlXXX5Lz5ZGh2e8vb08mh_07ojix8zBE6QntO-LS0J4NQqUhosggFSmpbfUgiDKRrz5M9mVouEldDR9KFMrTFc","q":"0cgCeY3xjh_o-S2DKPgevxQUBJmcBw4-BGAl2s42zY0dgUk2PD1qI7oXLD_sqcxLKDrJkbu2RVU3Ijb_54N3vNWkCNmHKPRmZTazX2nkYBy_DrHIaTa2vWDpQn2CzgOE6wNHsyypmI7r9cXJq4av-NLchOrbipbbsnJ6J4Si2GE","dp":"q2fheMP94h9SWdr4HDqu929jflXgOo7EwXtyA1l5N2HZJ1RasiWlBBYWKrR4GhT7UFkeqZUck2ejKXZMCtj0IjDvKdnH7gQVNKL5VCwDdEsNfMAjys3Xa2d1-g-HyvmU9QloBV5LULW5dKL9p7RO3381HyCF6I-2m5FwKQu4iwk","dq":"W6MXEaojnoXp6w8qgDcCl01aAThoo9xg0uB9KLtzzQ6bmOI2QtJBDyI3BSlXZETNf-FOM87frCGxV8zWtHcFUwOwB_2dwRIhuIzQhhlnnWRxQSX_-ZXg9ZDj1Buni_6VjWN9apNT8kRcZpvjoH3RWMwjcBx3km6bwbOoEKMrz4E","qi":"CAcxcVfclPF4pOZdsiETiVkS6SOnmoUaNGIYLuXqh_7PhDSdj0FMveXJQRG63I9bRl1WF-Qo-GBxXKIc33ImAkKQnT7I2tu6MRfGOOJn-G2KZ9QrH2sx70dRWmuLgB11QpmLZfIxYJZdac7_7G64g6mLYqiojBzDYlOr31BgyTc"}]}';
    this.apiUrl = config.apiUrl;
  }

  public async generateAccessToken(params: GenerateAccessTokenInput): Promise<GenerateAccessTokenOutput> {
    try {
      this.loggerService.trace("generateAccessToken called", { params }, this.constructor.name);

      const { clientId, userId, scope } = params;

      const keyStore = await this.jose.JWK.asKeyStore(JSON.parse(this.keyStoreJson));

      const key = await this.jose.JWK.asKey(keyStore.all({ use: "sig" })[0]);

      const now = Date.now().valueOf() / 1000;

      const payload: TokenPayload = {
        client_id: clientId,
        iss: this.apiUrl,
        sub: userId,
        scope,
        nbf: now,
        iat: now,
        exp: now + (60 * 5),
        jti: this.idService.generateId(),
      };

      const accessToken = await this.jose.JWS.createSign({ compact: true, fields: { typ: "jwt" } }, key)
        .update(JSON.stringify(payload))
        .final() as unknown as string;

      return { accessToken, expiryDate: 1 };
    } catch (error: unknown) {
      this.loggerService.error("Error in generateAccessToken", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async verifyAccessToken(params: VerifyAccessTokenInput): Promise<VerifyAccessTokenOutput> {
    try {
      this.loggerService.trace("verifyAccessToken called", { params }, this.constructor.name);

      const { token } = params;

      const keyStore = await this.jose.JWK.asKeyStore(JSON.parse(this.keyStoreJson));

      const { payload } = await this.jose.JWS.createVerify(keyStore).verify(token);

      const decodedToken = JSON.parse(payload.toString()) as TokenPayload;

      const now = Date.now().valueOf() / 1000;

      if (decodedToken.exp < now) {
        throw new ForbiddenError("Forbidden");
      }

      return { decodedToken };
    } catch (error: unknown) {
      this.loggerService.error("Error in verifyAccessToken", { error, params }, this.constructor.name);

      throw new ForbiddenError("Forbidden");
    }
  }
}

export type TokenServiceConfigInterface = Pick<EnvConfigInterface, "apiUrl">;

export interface TokenServiceInterface {
  generateAccessToken(params: GenerateAccessTokenInput): Promise<GenerateAccessTokenOutput>;
  verifyAccessToken(params: VerifyAccessTokenInput): Promise<VerifyAccessTokenOutput>
}

export interface GenerateAccessTokenInput {
  clientId: string;
  userId: UserId;
  scope: string;
}

export interface GenerateAccessTokenOutput {
  accessToken: string;
  expiryDate: number;
}

export interface VerifyAccessTokenInput {
  token: string;
}

export interface VerifyAccessTokenOutput {
  decodedToken: TokenPayload;
}

export interface TokenPayload {
  client_id: string;
  iss: string;
  sub: UserId;
  scope: string;
  nbf: number;
  iat: number;
  exp: number;
  jti: string;
}
