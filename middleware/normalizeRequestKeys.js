const toCamelCase = (key) => key.replace(/[-_](.)/g, (_, char) => char.toUpperCase());

const normalizeObjectKeys = (input, result = {}) => {
  if (Array.isArray(input)) {
    return input.map((item) => normalizeObjectKeys(item));
  }

  if (input !== null && typeof input === 'object') {
    Object.keys(input).forEach((rawKey) => {
      const value = input[rawKey];
      const key = toCamelCase(rawKey);

      if (key in result) {
        // Prefer existing camelCase key when duplicate forms are sent.
        return;
      }

      result[key] = normalizeObjectKeys(value);
    });
    return result;
  }

  return input;
};

const normalizeRequestKeys = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = normalizeObjectKeys(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = normalizeObjectKeys(req.query);
  }

  next();
};

module.exports = normalizeRequestKeys;
