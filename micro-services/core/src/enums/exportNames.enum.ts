const ExportNames = {
  MessageCreatedSnsTopicArn: "messageCreatedSnsTopicArn",
  YacUserPoolClientId: "yacUserPoolClientId",
  YacUserPoolClientSecret: "yacUserPoolClientSecret",
  YacUserPoolClientRedirectUri: "yacUserPoolClientRedirectUri",
  DomainName: "domainName",
};

export function generateExportNames(id: string): Readonly<typeof ExportNames> {
  const exportNamesCopy = { ...ExportNames };

  return Object.freeze(Object.entries(exportNamesCopy).reduce((acc, [ key, val ]) => {
    acc[key as keyof typeof ExportNames] = `${id}-${val}`;

    return acc;
  }, exportNamesCopy));
}
