/* eslint-disable @typescript-eslint/no-floating-promises */
import * as jose from "node-jose";

export type Jose = typeof jose;

export type JoseFactory = () => Jose;

export const joseFactory: JoseFactory = () => jose;

// (async () => {
//   const keyStoreJson = '{"keys":[{"kty":"RSA","kid":"aoYHsYmpR_PHA9sMpyxjkOk_lDusZwj1mZ-wCZAq_VE","use":"sig","alg":"RS256","e":"AQAB","n":"yWTfMFdQmye3sb1lkT4d82R7jDwno0X6nNlDAvdXdickyzA_ts2m26VVJ4sG-jz8doOv0u5QD_UQENUAwZtz_6airHIuc4bTduBpwKrgEWf6Ke-wKWQGKtDSMpbWIcp6bOaS0w3BLPrQGqN2vDcZ1CqwomAhsQ1bx7ayENLf-hfxzsDLFYs3yln4ZT7tDKpsIBdKB1GsC5fWaYLZ3jN6CqGRu4XBZptvN-hUXNOh-6KjN9cCsvxR-Gdy2mfJ3lU9rrl_-wekXfJ0HEHIwD167gk_jUJERhULB5jD5Q2HdykFfWWMIdeO2MQvM0Jk1JiSCm-CvoBmOI4anH54Nt9U9w","d":"lYQVCt-YEUiAYS2aTSVPuRYdfzRdvSLD91R5IqecwDQ5ZbxRYRb2zNTHDo9xw7ApQpdrnm6c8-vdXJG2eQY_LUp6NQqkH9K2Beh_urFhnqqSGDZBk8kVpw3XMAW5veaD03uu_4-TniArBcvb58oEm_aBols6SCcBv5iMRF86N4HjKESHDM2IKIfMzcpZ8aMgctszrDHWoTYvhSyfxShImDA7OxXn0Vs_c3FI5XgYUugJQNwr6AuTxM4qimdrwm4sfiHlCLye4EAbYjaabhayGHWSwpw0iV0O5zgIfgIdvdW4BYFutRt_OmTvI4hiClYbp7erMsHAQXuj1uHcABBTwQ","p":"9cPOznPcdUlwoHsMeVnJe5atV6BJNzfNXtVXei77gHQ67TwS8dIdIjoU1tw87aKy8NuiXslCSyndAzY5UEDfpSlXXX5Lz5ZGh2e8vb08mh_07ojix8zBE6QntO-LS0J4NQqUhosggFSmpbfUgiDKRrz5M9mVouEldDR9KFMrTFc","q":"0cgCeY3xjh_o-S2DKPgevxQUBJmcBw4-BGAl2s42zY0dgUk2PD1qI7oXLD_sqcxLKDrJkbu2RVU3Ijb_54N3vNWkCNmHKPRmZTazX2nkYBy_DrHIaTa2vWDpQn2CzgOE6wNHsyypmI7r9cXJq4av-NLchOrbipbbsnJ6J4Si2GE","dp":"q2fheMP94h9SWdr4HDqu929jflXgOo7EwXtyA1l5N2HZJ1RasiWlBBYWKrR4GhT7UFkeqZUck2ejKXZMCtj0IjDvKdnH7gQVNKL5VCwDdEsNfMAjys3Xa2d1-g-HyvmU9QloBV5LULW5dKL9p7RO3381HyCF6I-2m5FwKQu4iwk","dq":"W6MXEaojnoXp6w8qgDcCl01aAThoo9xg0uB9KLtzzQ6bmOI2QtJBDyI3BSlXZETNf-FOM87frCGxV8zWtHcFUwOwB_2dwRIhuIzQhhlnnWRxQSX_-ZXg9ZDj1Buni_6VjWN9apNT8kRcZpvjoH3RWMwjcBx3km6bwbOoEKMrz4E","qi":"CAcxcVfclPF4pOZdsiETiVkS6SOnmoUaNGIYLuXqh_7PhDSdj0FMveXJQRG63I9bRl1WF-Qo-GBxXKIc33ImAkKQnT7I2tu6MRfGOOJn-G2KZ9QrH2sx70dRWmuLgB11QpmLZfIxYJZdac7_7G64g6mLYqiojBzDYlOr31BgyTc"}]}';

//   const keyStore = await jose.JWK.asKeyStore(JSON.parse(keyStoreJson));

//   const key = await jose.JWK.asKey(keyStore.all({ use: "sig" })[0]);

//   const payload = JSON.stringify({ sub: "user-abc123", scope: "cat dog" });

//   const accessToken = await jose.JWS.createSign({ compact: true, fields: { typ: "jwt" } }, key).update(payload).final() as unknown as string;

//   console.log({ accessToken });
// })();
