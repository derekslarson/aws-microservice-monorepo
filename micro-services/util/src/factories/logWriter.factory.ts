export type LogWriter = typeof console;

export type LogWriterFactory = () => LogWriter;

export const logWriterFactory: LogWriterFactory = (): LogWriter => console;
