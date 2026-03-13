const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ message: "Token manquant" });
  }

  const token = authHeader.split(" ")[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ message: "Format de token invalide" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contient { id, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expiré" });
    }
    return res.status(401).json({ message: "Token invalide" });
  }
};

module.exports = authMiddleware;