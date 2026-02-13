/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging with more context
  console.error('\n❌ ERROR OCCURRED:');
  console.error('Path:', req.method, req.path);
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  console.error('Error Code:', err.code);
  if (req.body && Object.keys(req.body).length > 0) {
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
  }
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', err.stack);
  }
  console.error('---');

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error.statusCode = 404;
    error.message = message;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error.statusCode = 400;
    error.message = message;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    error.statusCode = 400;
    error.message = messages.join(', ');
    error.validationErrors = messages;
  }

  const errorResponse = {
    success: false,
    message: error.message || 'Server Error',
    ...(error.validationErrors && { validationErrors: error.validationErrors }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      errorName: err.name,
      errorCode: err.code 
    }),
  };

  console.error('Response:', JSON.stringify(errorResponse, null, 2));
  res.status(error.statusCode || 500).json(errorResponse);
};

export default errorHandler;
