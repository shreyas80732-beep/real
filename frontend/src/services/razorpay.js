export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const launchRazorpayPayment = async ({
  orderData,
  customerName,
  customerEmail,
  onSuccess,
  onFailure,
}) => {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    onFailure?.(new Error('Razorpay payment gateway failed to load. Please check your internet.'));
    return;
  }

  const options = {
    key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: orderData.amount, // 900 paise = ₹9
    currency: orderData.currency || 'INR',
    name: 'NoteCraft AI',
    description: 'Instant Study Guide PDF & Q&A (₹9)',
    image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=128&q=80',
    order_id: orderData.orderId,
    prefill: {
      name: customerName || 'Student',
      email: customerEmail || 'student@notes.in',
    },
    theme: {
      color: '#16a34a',
    },
    handler: function (response) {
      onSuccess?.(response);
    },
    modal: {
      ondismiss: function () {
        onFailure?.(new Error('Payment window closed.'));
      },
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', function (response) {
    onFailure?.(response.error);
  });

  rzp.open();
};
