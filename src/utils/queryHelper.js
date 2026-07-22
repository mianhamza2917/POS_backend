const { PAGINATION } = require('./constants');

/**
 * Safely parse pagination params from query string.
 * Prevents NaN from reaching MongoDB skip/limit.
 */
const parsePagination = (query) => {
  const pageNum = Math.max(1, parseInt(query.page, 10) || PAGINATION.DEFAULT_PAGE);
  const limitNum = Math.min(PAGINATION.MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || PAGINATION.DEFAULT_LIMIT));
  const skip = (pageNum - 1) * limitNum;
  return { pageNum, limitNum, skip };
};

/**
 * Whitelist-based sort field validator.
 * Prevents arbitrary field injection into MongoDB sort.
 */
const parseSort = (sortBy, sortOrder, allowedFields) => {
  const field = allowedFields.includes(sortBy) ? sortBy : allowedFields[0];
  const order = sortOrder === 'asc' ? 1 : -1;
  return { [field]: order };
};

module.exports = { parsePagination, parseSort };
