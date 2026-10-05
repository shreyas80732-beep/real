import mongoose from 'mongoose';

// 1. Transaction / Order Schema (For ₹9 pay-per-PDF flow)
const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  paymentId: {
    type: String,
  },
  customerEmail: {
    type: String,
    default: 'guest@student.in',
  },
  customerName: {
    type: String,
    default: 'Student',
  },
  amount: {
    type: Number,
    required: true,
    default: 9, // ₹9 per PDF
  },
  status: {
    type: String,
    enum: ['CREATED', 'PAID', 'USED', 'FAILED'],
    default: 'CREATED',
  },
  generationToken: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 2. Generated Study Guide Schema
const noteSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
  },
  paymentId: {
    type: String,
  },
  customerEmail: {
    type: String,
    default: 'guest@student.in',
  },
  title: {
    type: String,
    required: true,
  },
  rawInputText: {
    type: String,
    required: true,
  },
  generatedContent: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 3. User Schema (Maintained for backward compatibility)
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  isSubscribed: {
    type: Boolean,
    default: false,
  },
  subscriptionStartDate: Date,
  subscriptionExpiryDate: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 4. Payment History Schema (Maintained for backward compatibility)
const paymentHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  paymentId: {
    type: String,
    required: true,
  },
  orderId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
    default: 'PENDING',
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
});

// 5. Note History Schema (Maintained for backward compatibility)
const noteHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  rawInputText: {
    type: String,
    required: true,
  },
  generatedContent: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Order = mongoose.model('Order', orderSchema);
export const Note = mongoose.model('Note', noteSchema);
export const User = mongoose.model('User', userSchema);
export const PaymentHistory = mongoose.model('PaymentHistory', paymentHistorySchema);
export const NoteHistory = mongoose.model('NoteHistory', noteHistorySchema);
