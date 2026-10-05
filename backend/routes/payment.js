import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Order } from '../models.js';

const router = express.Router();

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing.');
  }

  return new Razorpay({ key_id, key_secret });
};

// 1. POST /api/payment/create-order (₹9 per PDF study guide)
router.post('/create-order', async (req, res) => {
  try {
    const { name = 'Student', email = 'student@study.in', title = 'Study Guide' } = req.body;

    const razorpay = getRazorpayInstance();

    // 900 paise = ₹9 per PDF guide
    const amountInPaise = 900;

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `pdf_${Date.now().toString().slice(-8)}`,
      notes: {
        plan: 'pay_per_pdf_9rs',
        customerName: name,
        customerEmail: email,
        noteTitle: title.slice(0, 30),
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Save order in MongoDB
    const newOrder = new Order({
      orderId: razorpayOrder.id,
      amount: 9,
      customerName: name,
      customerEmail: email,
      status: 'CREATED',
    });
    await newOrder.save();

    res.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      customerName: name,
      customerEmail: email,
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({
      message: 'Failed to initialize ₹9 payment order.',
      error: error.message,
    });
  }
});

// 2. POST /api/payment/verify (Direct Client Callback Verification)
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification credentials.' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature. Verification failed.' });
    }

    // Generate single-use generation token
    const generationToken = crypto.randomBytes(24).toString('hex');

    const updatedOrder = await Order.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        paymentId: razorpay_payment_id,
        status: 'PAID',
        generationToken,
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Payment verified! Generating your study guide...',
      orderId: razorpay_order_id,
      generationToken,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: 'Payment verification failed.', error: error.message });
  }
});

// 3. POST /api/payment/webhook (Razorpay Webhook)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!webhookSecret || !signature) {
      return res.status(400).json({ message: 'Webhook secret or signature missing.' });
    }

    const payload = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ message: 'Invalid webhook signature.' });
    }

    const eventData = typeof req.body === 'object' && !Buffer.isBuffer(req.body)
      ? req.body
      : JSON.parse(payload);

    if (eventData.event === 'payment.captured') {
      const paymentEntity = eventData.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      if (orderId) {
        await Order.findOneAndUpdate(
          { orderId },
          { paymentId, status: 'PAID' }
        );
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Webhook failed.' });
  }
});

export default router;
