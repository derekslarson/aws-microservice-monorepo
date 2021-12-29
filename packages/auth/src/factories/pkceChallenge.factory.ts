import * as pkceChallenge from "pkce-challenge";

export type PkceChallenge = typeof pkceChallenge;

export type PkceChallengeFactory = () => PkceChallenge;

export const pkceChallengeFactory: PkceChallengeFactory = () => pkceChallenge;
