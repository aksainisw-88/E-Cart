const jwt = require("jsonwebtoken");

const getTokenFromRequest = (request) => request.cookies.accessToken;

const requireAuth = (request, response, next) => {
  const token = getTokenFromRequest(request);

  if (!token) {
    return response.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    request.user = jwt.verify(token, request.app.locals.env.JWT_SECRET);
    return next();
  } catch {
    return response.status(401).json({ success: false, message: "Session expired. Please sign in again." });
  }
};

const requireRole = (role) => (request, response, next) => {
  if (request.user?.role !== role) {
    return response.status(403).json({ success: false, message: "You do not have permission to perform this action." });
  }

  return next();
};

const requireOptionalAuth = (request, response, next) => {
  const token = getTokenFromRequest(request);

  if (!token) {
    return next();
  }

  try {
    request.user = jwt.verify(token, request.app.locals.env.JWT_SECRET);
    return next();
  } catch {
    return next();
  }
};

const requireAnyRole = (...roles) => (request, response, next) => {
  if (!roles.includes(request.user?.role)) {
    return response.status(403).json({ success: false, message: "You do not have permission to perform this action." });
  }
  return next();
};

module.exports = { requireAuth, requireRole, requireAnyRole, requireOptionalAuth };