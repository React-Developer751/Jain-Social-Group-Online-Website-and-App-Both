import type { NextFunction, Request, Response } from "express";
import env from "../config/env.js";
import logger from "../utils/logger.js";

/**
 * Stops internal failures describing themselves to the client.
 *
 * The central error handler already returns a safe message, but most
 * controllers catch their own errors and answer with `err.message` directly,
 * which never reaches that handler. A malformed id, for example, replied with
 *
 *   Cast to ObjectId failed for value "notanid" at path "chatId" for model "Message"
 *
 * That hands a stranger the collection names, the field names and the driver
 * in use, and it is the sort of thing that gets found by fuzzing a few URLs.
 * Rewriting it in all ninety-odd places would be churn and the next new
 * controller would reintroduce it, so the reply itself is cleaned here.
 *
 * Only server errors are touched. A 4xx message is written for the person
 * reading it and must survive. Development is left alone so a stack trace is
 * still one request away.
 */
export const sanitizeServerErrors = (req: Request, res: Response, next: NextFunction) => {
  if (!env.isProduction) return next();

  const originalJson = res.json.bind(res);

  res.json = (body?: unknown) => {
    if (res.statusCode < 500) return originalJson(body);

    // Keep the detail where it belongs: in the log, with the request.
    logger.error(
      { method: req.method, url: req.originalUrl, status: res.statusCode, body },
      "Server error returned to a client"
    );

    return originalJson({
      success: false,
      code: "INTERNAL_ERROR",
      message: "Something went wrong on our side. Please try again."
    });
  };

  next();
};

export default sanitizeServerErrors;
