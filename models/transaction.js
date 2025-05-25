// models/transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  wallet: { type: String, required: true },
  type: { type: String, enum: ['receive', 'send'], required: true },
  amount: { type: Number, required: true },
  address: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
