import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { Order, Note } from '../models.js';

const router = express.Router();

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenAI({ apiKey });
};

// 1. POST /api/notes/generate-stream (Passwordless - Authenticated via ₹9 Order/Token)
router.post('/generate-stream', async (req, res) => {
  const { title, uploadedText, orderId, generationToken } = req.body;

  if (!title || !uploadedText || uploadedText.trim().length === 0) {
    return res.status(400).json({ message: 'Topic title and study notes content are required.' });
  }

  // Allow bypass in test mode if SKIP_PAYMENT=true in .env
  const isDevBypass = process.env.SKIP_PAYMENT === 'true';

  if (!isDevBypass) {
    if (!orderId || !generationToken) {
      return res.status(402).json({
        message: 'Payment of ₹9 is required to generate this study guide.',
        paymentRequired: true,
      });
    }

    // Verify order in database
    const order = await Order.findOne({ orderId });
    if (!order || (order.status !== 'PAID' && order.generationToken !== generationToken)) {
      return res.status(402).json({
        message: 'Valid ₹9 payment verification required.',
        paymentRequired: true,
      });
    }
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let completeOutput = '';

  try {
    const ai = getGeminiClient();

    const systemPrompt = `You are NoteCraft AI, an elite educational and exam preparation assistant.
Your goal is to transform student study notes into clear, high-scoring revision materials.

Analyze the provided study notes and generate structured, markdown-formatted study notes following this EXACT 4-part structure:

# 📖 ${title.trim()} - Exam Study Guide

## 1. Core Theory & Simple Summary
- Provide an intuitive, easy-to-understand breakdown of the core concepts, principles, and key definitions.
- Use bullet points, bold key terms, and simple analogies where helpful.

---

## 2. Important 2-Mark Questions & Answers (Concise & Direct)
- Generate 4 to 6 focused 2-mark questions.
- Answers should be crisp (2-3 sentences or direct bullet points) with exact definitions, formula, or key points expected in exams.

---

## 3. Important 3-Mark Questions & Answers (Analytical & Conceptual)
- Generate 3 to 5 conceptual 3-mark questions.
- Answers should include key reasons, brief steps, or concise comparisons (3-4 points per answer).

---

## 4. Detailed 6-Mark Questions & Answers (Comprehensive & Descriptive)
- Generate 2 to 3 detailed essay/case/derivation/long questions covering all main topics.
- Structure answers with:
  * Introduction
  * Step-by-step points or diagrams/tables description
  * Key takeaway / exam tip

Here is the student's raw study material:
"""
${uploadedText.trim()}
"""`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.7-flash';

    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: systemPrompt,
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        completeOutput += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
        if (typeof res.flush === 'function') {
          res.flush();
        }
      }
    }

    // Save note to database
    if (completeOutput.trim().length > 0) {
      const savedNote = new Note({
        orderId: orderId || 'DEMO_ORDER',
        title: title.trim(),
        rawInputText: uploadedText.trim(),
        generatedContent: completeOutput.trim(),
      });
      await savedNote.save();

      // Mark order as used
      if (orderId && !isDevBypass) {
        await Order.findOneAndUpdate({ orderId }, { status: 'USED' });
      }
    }

    // Signal completion
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Gemini generation stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Error occurred while generating study notes.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// 2. GET /api/notes/order/:orderId (Retrieve previously generated note by order ID)
router.get('/order/:orderId', async (req, res) => {
  try {
    const note = await Note.findOne({ orderId: req.params.orderId });
    if (!note) {
      return res.status(404).json({ message: 'Study guide not found for this order ID.' });
    }
    res.json({ note });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve note.' });
  }
});

export default router;
