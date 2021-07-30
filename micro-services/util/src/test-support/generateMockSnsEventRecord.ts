import { SNSEventRecord } from "aws-lambda/trigger/sns";

export function generateMockSNSEventRecord(message = {}, topicArn = "mock-sns-topic-arn"): SNSEventRecord {
  return {
    EventVersion: "mock-event-version",
    EventSubscriptionArn: "mock-event-subscription-arn",
    EventSource: "mock-event-source",
    Sns: {
      TopicArn: topicArn,
      Message: JSON.stringify(message),
      SignatureVersion: "mock-signature-version",
      Timestamp: "mock-timestamp",
      Signature: "mock-signature",
      SigningCertUrl: "mock-signing-cert-url",
      MessageId: "mock-message-id",
      MessageAttributes: {},
      Type: "mock-type",
      UnsubscribeUrl: "mock-unsubscribe-url",
      Subject: "mock-subject",
    },
  };
}
