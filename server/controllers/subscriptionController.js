const stripe = require('../config/stripe');
const Subscription = require('../models/Subscription');
const BillingHistory = require('../models/BillingHistory');
const User = require('../models/User');

// Define Stripe Price IDs for each tier
// Replace these with your actual Stripe Price IDs from your Stripe Dashboard
const PRICE_MAP = {
  basic: process.env.STRIPE_PRICE_BASIC || 'price_basic_placeholder',
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_placeholder',
};

const DEV_AMOUNT_MAP = {
  basic: '$9.99',
  pro: '$29.99',
  enterprise: '$49.99',
};

const isStripeConfigured = () => {
  const hasSecret = Boolean(process.env.STRIPE_SECRET_KEY);
  const hasRealPrices = Object.values(PRICE_MAP).every((priceId) => !String(priceId).includes('placeholder'));
  return hasSecret && hasRealPrices;
};

const getMySubscription = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user not found in request',
      });
    }

    const subscription = await Subscription.findOne({
      where: { userId: req.user.id },
    });

    res.json({
      success: true,
      subscription: subscription || { tier: 'free', status: 'active' },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription',
      error: error.message,
    });
  }
};

const getBillingHistory = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const history = await BillingHistory.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']], 
    });

    res.json({
      success: true,
      history: history || [],
    });
  } catch (error) {
    console.error('Get billing history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billing history',
      error: error.message,
    });
  }
};


const createCheckoutSession = async (req, res) => {
  try {
    const { tier } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!tier || !PRICE_MAP[tier]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription tier. Must be: basic, pro, or enterprise',
      });
    }

    console.log('Creating checkout session for:', {
      userId: req.user.id,
      email: req.user.email,
      tier,
      priceId: PRICE_MAP[tier],
    });

    if (!isStripeConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          success: false,
          message: 'Stripe is not configured. Please contact support.',
        });
      }

      const existingSubscription = await Subscription.findOne({
        where: { userId: req.user.id },
      });

      let activeSubscription = existingSubscription;

      if (existingSubscription) {
        await existingSubscription.update({
          tier,
          status: 'active',
          startDate: existingSubscription.startDate || new Date(),
          autoRenew: true,
        });
      } else {
        activeSubscription = await Subscription.create({
          userId: req.user.id,
          tier,
          status: 'active',
          startDate: new Date(),
          autoRenew: true,
        });
      }

      await User.update(
        {
          accountType: 'leader',
          subscriptionTier: tier,
          isPaid: true,
        },
        { where: { id: req.user.id } }
      );

      await BillingHistory.create({
        userId: req.user.id,
        subscriptionId: activeSubscription?.id || null,
        plan: tier,
        amount: DEV_AMOUNT_MAP[tier] || '$0.00',
        status: 'paid',
        paidAt: new Date(),
      });

      return res.json({
        success: true,
        url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/?view=subscription&success=true&mock=true`,
        mock: true,
        message: 'Stripe is not configured; applied development upgrade flow.',
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: req.user.email,
      line_items: [
        {
          price: PRICE_MAP[tier],
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/?view=subscription&success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/?view=subscription&canceled=true`,
      metadata: {
        userId: req.user.id,
        tier,
      },
    });

    res.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: error.message,
    });
  }
};

console.log('Stripe configuration:', {
  keyLoaded: !!process.env.STRIPE_SECRET_KEY,
  webhookSecretLoaded: !!process.env.STRIPE_WEBHOOK_SECRET,
  priceBasic: PRICE_MAP.basic,
  pricePro: PRICE_MAP.pro,
  priceEnterprise: PRICE_MAP.enterprise,
});

const verifyCheckoutSession = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }
    
    // Check if billing history already exists for this session to prevent duplicates
    const existingBilling = await BillingHistory.findOne({
      where: {
        stripeInvoiceId: session_id // using it as an indentifier here safely
      }
    });

    if (existingBilling) {
      return res.json({ success: true, message: 'Already processed' });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session || session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Payment not successful' });
    }

    const tier = session.metadata.tier;
    const userId = session.metadata.userId;

    const existingSubscription = await Subscription.findOne({
      where: { userId }
    });

    let activeSubId = existingSubscription?.id;

    if (existingSubscription) {
      await existingSubscription.update({
        tier,
        status: 'active',
        startDate: new Date(),
        autoRenew: true,
      });
    } else {
      const sub = await Subscription.create({
        userId,
        tier,
        status: 'active',
        startDate: new Date(),
        autoRenew: true,
      });
      activeSubId = sub.id;
    }

    await User.update(
      {
        accountType: 'leader',
        subscriptionTier: tier,
        isPaid: true,
      },
      { where: { id: userId } }
    );

    await BillingHistory.create({
      userId,
      subscriptionId: activeSubId,
      plan: tier,
      amount: session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : '$0.00',
      status: 'paid',
      paidAt: new Date(),
      stripeInvoiceId: session_id,
    });

    res.json({ success: true, message: 'Subscription successfully verified' });
  } catch (error) {
    console.error('Verify checkout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify checkout session',
      error: error.message,
    });
  }
};

module.exports = {
  createCheckoutSession,
  getBillingHistory,
  getMySubscription,
  verifyCheckoutSession,
};