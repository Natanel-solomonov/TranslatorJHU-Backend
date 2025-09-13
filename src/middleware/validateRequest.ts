import { Request, Response, NextFunction } from "express";
import { validate, ValidationError } from "class-validator";
import { plainToClass } from "class-transformer";
import { logger } from "../utils/logger";

export const validateRequest = (dtoClass: any) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const dto = plainToClass(dtoClass, req.body);
      const errors: ValidationError[] = await validate(dto);

      if (errors.length > 0) {
        const errorMessages = errors.map((error) => {
          const constraints = error.constraints;
          return constraints
            ? Object.values(constraints).join(", ")
            : "Validation error";
        });

        res.status(400).json({
          error: "Validation failed",
          details: errorMessages,
        });
        return;
      }

      req.body = dto;
      next();
    } catch (error) {
      logger.error("Validation middleware error:", error);
      res
        .status(500)
        .json({ error: "Internal server error during validation" });
    }
  };
};

export default validateRequest;





