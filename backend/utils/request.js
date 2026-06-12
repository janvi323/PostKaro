const mongoose = require('mongoose');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const cleanSearchQuery = (value, maxLength = 50) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

const regexForSearch = (value) => new RegExp(escapeRegex(cleanSearchQuery(value)), 'i');

const parsePagination = (query, defaults = {}) => {
  const defaultLimit = defaults.defaultLimit || 20;
  const maxLimit = defaults.maxLimit || 50;
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit || query.per_page, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const requireObjectId = (res, value, label = 'id') => {
  if (isObjectId(value)) return true;
  res.status(400).json({ success: false, message: `Invalid ${label}` });
  return false;
};

module.exports = {
  cleanSearchQuery,
  escapeRegex,
  isObjectId,
  parsePagination,
  regexForSearch,
  requireObjectId,
};
