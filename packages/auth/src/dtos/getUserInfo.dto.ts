import { Record } from "runtypes";

// Need an empty dto to pass to the validation service so we can cleanly fetch the userId and scopes from the request
export const GetUserInfoDto = Record({});
