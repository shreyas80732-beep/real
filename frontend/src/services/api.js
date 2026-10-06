const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * 1. Extract text from uploaded PDF, TXT, or Markdown documents
 */
export const parseDocumentFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/notes/parse-pdf`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to extract text from file.');
  }
  return data;
};

/**
 * 2. Create a ₹9 payment order for a single PDF / study guide
 */
export const createPaymentOrder = async ({ name, email, title }) => {
  const response = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, title }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to initialize payment.');
  }
  return data;
};

/**
 * 3. Verify Razorpay Payment Signature
 */
export const verifyPayment = async (paymentDetails) => {
  const response = await fetch(`${API_BASE_URL}/api/payment/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentDetails),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Payment verification failed.');
  }
  return data;
};

/**
 * 4. Stream study guide generation with SSE (ReadableStream)
 */
export const streamNoteGeneration = async ({
  title,
  uploadedText,
  orderId,
  generationToken,
  onChunk,
  onError,
  onDone,
  signal,
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notes/generate-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({ title, uploadedText, orderId, generationToken }),
      signal,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const error = new Error(errData.message || 'Failed to generate study guide.');
      error.status = response.status;
      error.data = errData;
      throw error;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || '';

      for (const part of parts) {
        const lines = part.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.replace('data: ', '').trim();
            if (dataStr === '[DONE]') {
              if (onDone) onDone();
              return;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                if (onError) onError(new Error(parsed.error));
                return;
              }
              if (parsed.text && onChunk) {
                onChunk(parsed.text);
              }
            } catch (e) {
              console.error('Failed to parse SSE payload:', e, dataStr);
            }
          }
        }
      }
    }

    if (onDone) onDone();
  } catch (error) {
    if (onError) onError(error);
  }
};
