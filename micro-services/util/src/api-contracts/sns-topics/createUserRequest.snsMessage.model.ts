type EmailCreateUserRequestSnsMessage = {
  email: string;
};

type PhoneCreateUserRequestSnsMessage = {
  phone: string;
};

export type CreateUserRequestSnsMessage = EmailCreateUserRequestSnsMessage | PhoneCreateUserRequestSnsMessage;
