import { verifyToken } from '@clerk/backend';

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Unauthorized: No token" });
    }

    const token = authHeader.split(' ')[1];
    
    // ✅ Add clockSkewInMs to tolerate small time differences
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      clockSkewInMs: 60000, // tolerate up to 60 seconds clock difference
    });
    
    console.log("✅ Verified userId:", payload.sub);

    req.auth = {
      userId: payload.sub,
      orgId: payload.o?.id || null,
    };

    return next();

  } catch (error) {
    console.error("AUTH ERROR:", error.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};