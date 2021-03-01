export type LogWriter = typeof console.log;

export type LogWriterFactory = () => LogWriter;

// eslint-disable-next-line no-console
export const logWriterFactory: LogWriterFactory = (): LogWriter => console.log;
