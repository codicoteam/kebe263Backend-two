const searchService = require('../services/search.service');
const { success } = require('../utils/apiResponse');

const globalSearch = async (req, res, next) => {
  try {
    const results = await searchService.globalSearch(req.query);
    return success(res, 'Search results fetched', results);
  } catch (err) { next(err); }
};

module.exports = { globalSearch };
