import { getAuth } from "@clerk/express";

export const protect = async (req, res, next) => {
  try {
    const auth = getAuth(req);

    // ✅ Reject immediately if Clerk couldn't authenticate
    if (!auth || !auth.userId) {
      return res.status(401).json({
        message: "Unauthorized: No user context",
      });
    }

    req.auth = auth;
    return next();

  } catch (error) {
    console.error("AUTH ERROR:", error);
    return res.status(401).json({
      message: error.message,
    });
  }
};