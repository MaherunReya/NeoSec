const express = require('express');
const stripe = require('../config/stripe');
const Subscription = require('../models/Subscription');
const BillingHistory = require('../models/BillingHistory');
const User = require('../models/User');

const router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      const userId = session.metadata.userId;
      const tier = session.metadata.tier;

      if (!userId || !tier) {
        return res.status(400).json({
          received: false,
          message: 'Missing userId or tier in Stripe metadata',
        });
      }

      let sub = await Subscription.findOne({ where: { userId } });

      if (!sub) {
        sub = await Subscription.create({
          userId,
          tier,
          status: 'active',
          startDate: new Date(),
          autoRenew: true,
        });
      } else {
        await sub.update({
          tier,
          status: 'active',
          startDate: sub.startDate || new Date(),
          autoRenew: true,
        });
      }

      await User.update(
        {
          accountType: 'leader',
          subscriptionTier: tier,
          isPaid: true,
        },
        {
          where: { id: userId },
        }
      );

      const amountText =
        typeof session.amount_total === 'number'
          ? `$${(session.amount_total / 100).toFixed(2)}`
          : '$0.00';

      if (session.invoice) {
        const existingInvoice = await BillingHistory.findOne({
          where: { stripeInvoiceId: session.invoice },
        });

        if (!existingInvoice) {
          await BillingHistory.create({
            userId,
            subscriptionId: sub.id,
            plan: tier,
            amount: amountText,
            status: 'paid',
            paidAt: new Date(),
            stripeInvoiceId: session.invoice,
            stripePaymentIntentId: session.payment_intent || null,
          });
        }
      }
    }

    res.json({ received: true });
  }
);

module.exports = router;
