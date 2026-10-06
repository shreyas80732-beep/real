import express from 'express';
import multer from 'multer';
import { createRequire } from 'module';
import { GoogleGenAI } from '@google/genai';
import { Order, Note } from '../models.js';

const require = createRequire(import.meta.url);
const pdfPkg = require('pdf-parse');
const AdmZip = require('adm-zip');

const router = express.Router();

// Memory storage for file uploads (PDF, PPT, PPTX, TXT, MD) up to 50MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenAI({ apiKey });
};

// 1. Helper for extracting PDF text
const extractPdfText = async (buffer) => {
  try {
    if (typeof pdfPkg.PDFParse === 'function') {
      const parser = new pdfPkg.PDFParse({ data: buffer });
      if (typeof parser.load === 'function') await parser.load();
      if (typeof parser.getText === 'function') {
        const textResult = await parser.getText();
        const text = typeof textResult === 'string' ? textResult : (textResult?.text || '');
        return { text, pages: parser.doc?.numPages || 1 };
      }
    }
    if (typeof pdfPkg === 'function') {
      const data = await pdfPkg(buffer);
      return { text: data.text || '', pages: data.numpages || 1 };
    }
  } catch (err) {
    console.error('PDF parsing error:', err);
  }
  return { text: '', pages: 1 };
};

// 2. Helper for extracting PowerPoint (PPTX) slide text
const extractPptxText = (buffer) => {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    let text = '';
    let slideCount = 0;

    const slideEntries = zipEntries
      .filter((entry) => entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml'))
      .sort((a, b) => {
        const numA = parseInt(a.entryName.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.entryName.match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
      });

    slideEntries.forEach((entry, idx) => {
      slideCount++;
      const xml = entry.getData().toString('utf8');
      const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
      if (matches) {
        const slideText = matches
          .map((m) => m.replace(/<[^>]+>/g, ''))
          .join(' ')
          .trim();
        if (slideText) {
          text += `\n--- Slide ${idx + 1} ---\n${slideText}\n`;
        }
      }
    });

    return { text: text.trim(), pages: slideCount || 1 };
  } catch (err) {
    console.error('PPTX extraction error:', err);
    return { text: '', pages: 1 };
  }
};

// 1. POST /api/notes/parse-pdf (Extract text from PDF, PPTX, TXT, or Markdown)
router.post('/parse-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { originalname, buffer } = req.file;
    const lowerName = originalname.toLowerCase();

    let extractedText = '';
    let numPages = 1;

    if (lowerName.endsWith('.pdf')) {
      const parsed = await extractPdfText(buffer);
      extractedText = parsed.text;
      numPages = parsed.pages;
    } else if (lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt')) {
      const parsed = extractPptxText(buffer);
      extractedText = parsed.text;
      numPages = parsed.pages;
    } else {
      // Plain text or Markdown
      extractedText = buffer.toString('utf8');
    }

    if (!extractedText.trim()) {
      return res.status(422).json({
        message: 'Could not find readable text in this file. Please paste notes text directly.',
      });
    }

    // Clean up filename to serve as automatic Title
    const autoTitle = originalname
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .trim();

    res.json({
      success: true,
      filename: originalname,
      title: autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1),
      pages: numPages,
      text: extractedText.trim(),
    });
  } catch (error) {
    console.error('File parsing error:', error);
    res.status(500).json({
      message: 'Failed to read document file.',
      error: error.message,
    });
  }
});

// 2. POST /api/notes/generate-stream (Chunk-by-chunk real-time SSE streaming)
router.post('/generate-stream', async (req, res) => {
  const { title, uploadedText, orderId, generationToken } = req.body;

  if (!uploadedText || uploadedText.trim().length === 0) {
    return res.status(400).json({ message: 'Study notes or document content is required.' });
  }

  const resolvedTitle = title && title.trim().length > 0 ? title.trim() : 'Study Guide';

  // Allow bypass in test mode if SKIP_PAYMENT=true in .env
  const isDevBypass = process.env.SKIP_PAYMENT === 'true';

  if (!isDevBypass && orderId && generationToken) {
    const order = await Order.findOne({ orderId });
    if (!order || (order.status !== 'PAID' && order.generationToken !== generationToken)) {
      return res.status(402).json({
        message: 'Valid ₹9 payment verification required.',
        paymentRequired: true,
      });
    }
  }

  // Real-time SSE Streaming Headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Instant handshake ping
  res.write(': stream-ready\n\n');
  if (typeof res.flush === 'function') res.flush();

  let completeOutput = '';

  try {
    const ai = getGeminiClient();

    const systemPrompt = `You are NoteCraft AI, an expert exam tutor and study material creator.
Your goal is to read the provided study notes/slides/PDF and generate an exceptionally clear, high-scoring exam guide.

Analyze the provided study notes and generate structured, markdown-formatted content following this EXACT 4-part structure:

# 📖 ${resolvedTitle} - Exam Study Guide

## 1. Easy & Detailed Theory Summary
- Provide a comprehensive, easy-to-understand, detailed breakdown of all core concepts, definitions, laws, formulas, and mechanisms.
- Use clear bullet points, bold keywords, and simple analogies to make complex topics effortless to learn.

---

## 2. Important 1-Mark Questions & Answers (Direct & Definitions)
- Generate 6 to 8 direct 1-mark exam questions (one-liners, definitions, key terms, formulas, fill-in-the-blanks).
- Provide crisp, 1-sentence high-accuracy answers.

---

## 3. Important 2-Mark Questions & Answers (Short & Conceptual)
- Generate 4 to 6 focused 2-mark questions (definitions with examples, key differences, reasons, 2 distinct points).
- Answers should be concise, formatted in clear bullet points with exact exam keywords.

---

## 4. Important 6-Mark Questions & Answers (Comprehensive Long Answers)
- Generate 2 to 4 detailed essay/long-answer questions covering all main topics.
- Structure each answer for full exam marks:
  * **Introduction & Key Definition**
  * **Detailed Step-by-Step Explanation / Diagram & Table Breakdown**
  * **Key Formula / Example / Working Mechanism**
  * **Exam Tip / Summary Conclusion**

Here is the student's study material:
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
        title: resolvedTitle,
        rawInputText: uploadedText.trim().slice(0, 5000),
        generatedContent: completeOutput.trim(),
      });
      await savedNote.save();

      if (orderId && !isDevBypass) {
        await Order.findOneAndUpdate({ orderId }, { status: 'USED' });
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Generation stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Error occurred while generating study notes.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// 3. GET /api/notes/history (Retrieve recent study guides)
router.get('/history', async (req, res) => {
  try {
    const notes = await Note.find({})
      .select('title createdAt _id')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({ notes });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve notes history.' });
  }
});

// 4. GET /api/notes/:id (Fetch single study guide detail)
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Study guide not found.' });
    }
    res.json({ note });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve note detail.' });
  }
});

// 5. DELETE /api/notes/:id (Delete a study guide)
router.delete('/:id', async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Study guide deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete note.' });
  }
});

export default router;
