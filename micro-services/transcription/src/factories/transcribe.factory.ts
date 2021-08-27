import TranscribeService from "aws-sdk/clients/transcribeservice";

export type Transcribe = TranscribeService;

export type TranscribeFactory = () => Transcribe;

export const transcribeFactory: TranscribeFactory = () => new TranscribeService();
