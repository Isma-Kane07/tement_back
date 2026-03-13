const roleMiddleware = (allowedRoles = []) => {
  if (typeof allowedRoles === 'string') {
    allowedRoles = [allowedRoles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Accès interdit : rôle non autorisé",
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }
    
    next();
  }
};

module.exports = roleMiddleware;