/* eslint-disable @typescript-eslint/no-floating-promises */
import { buildAssets, EAssetsType } from "./build";

(async () => {
  await buildAssets("auth-service", { env: { hell: "of" }, type: EAssetsType.REACT });
})();
