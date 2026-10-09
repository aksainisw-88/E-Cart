const jwt = require("jsonwebtoken");
const User = require("../models/User");

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

const requireAnyMenuPermission = (...permissions) => async (request, response, next) => {
  try {
    const user = await User.findById(request.user.id).select("menuPermissions").lean();
    if (!user) return response.status(401).json({ success: false, message: "Account no longer exists." });
    const requiredPermissions = permissions.length === 1 && typeof permissions[0] === "function"
      ? permissions[0](request)
      : permissions;
    if (requiredPermissions && Array.isArray(user.menuPermissions) && !requiredPermissions.some((permission) => user.menuPermissions.includes(permission))) {
      return response.status(403).json({ success: false, message: "You do not have permission to access this admin menu." });
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { requireAuth, requireRole, requireAnyRole, requireOptionalAuth, requireAnyMenuPermission };