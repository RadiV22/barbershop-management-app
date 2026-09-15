import type { Request, Response, NextFunction } from "express";
import type { Role } from "../generated/prisma/client.js";

export const role = (allowedRoles: string[]) => {
  return (req: Request, res: Response, Next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          message: "Anda belum terautentikasi!",
        });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          message: `Akses ditolak! Fitur ini hanya untuk ${allowedRoles.join(",")}`,
        });
      }

      Next();
    } catch (error) {
      Next(error);
    }
  };
};
