const notFound = (request, response) => {
  response.status(404).json({
    success: false,
    message: `Route not found: ${request.method} ${request.originalUrl}`,
  });
};

const errorHandler = (error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  console.error(error);
  response.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode ? error.message : "Internal server error",
  });
};

module.exports = { notFound, errorHandler };