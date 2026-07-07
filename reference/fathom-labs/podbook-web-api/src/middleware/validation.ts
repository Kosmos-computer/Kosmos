const { Request, Response, NextFunction } = require('express');
const { validationResult } = require('express-validator');

module.exports.validateRequest = function(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};
