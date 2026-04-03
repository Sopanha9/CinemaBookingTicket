function validateBody(validator) {
  return (req, res, next) => {
    const result = validator(req.body || {});

    if (result.errors.length > 0) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.errors,
      });
    }

    req.validatedBody = result.value;
    return next();
  };
}

module.exports = validateBody;
