const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  const message = statusCode === 413
    ? "Image must be 8 MB or smaller."
    : err.message || "Internal Server Error";

  return res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [],
  });
};

export default errorHandler;