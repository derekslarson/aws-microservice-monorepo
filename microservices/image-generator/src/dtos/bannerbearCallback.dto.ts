import { Record, String } from "runtypes";

export const BannerbearCallbackDto = Record({
  headers: Record({ authorization: String }),
  body: Record({ metadata: String, image_url: String }),
});
