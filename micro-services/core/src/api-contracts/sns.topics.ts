export type ClientsUpdatedSnsMessage = {
  apiId?: string;
};

export type UserSignedUpSnsMessage = {
  id: string;
  email: string;
};

export type UserCreatedSnsMessage = {
  id: string;
  email: string;
};
