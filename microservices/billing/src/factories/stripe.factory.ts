import { Stripe as StripeClass } from "stripe";

export type Stripe = StripeClass;

export type StripeFactory = (apiKey: string) => Stripe;

export const stripeFactory: StripeFactory = (apiKey: string) => new StripeClass(apiKey, { apiVersion: "2020-08-27" });
