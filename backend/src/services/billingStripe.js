const Stripe = require("stripe");
const env = require("../config/env");

let stripeClient = null;

function getStripe() {
  if (!env.stripeSecretKey) return null;
  if (!stripeClient) stripeClient = new Stripe(env.stripeSecretKey);
  return stripeClient;
}

function isStripeConfigured() {
  return Boolean(env.stripeSecretKey && env.stripePriceId);
}

module.exports = { getStripe, isStripeConfigured };
