/**
 * HTTP client utilities
 *
 * Provides HTTP client functionality for external API calls and web scraping.
 *
 * @module utils/http
 */

import { NetworkError, createErrorContext } from "./errors.ts";
import type {
  ApiResponse,
  CacheMetadata,
  RateLimitInfo,
} from "../types/external.ts";

/**
 * HTTP method types
 */
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS";

/**
 * HTTP request options
 */
export interface RequestOptions {
  /** Request method */
  method?: HttpMethod;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: BodyInit;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to follow redirects */
  redirect?: "follow" | "manual" | "error";
  /** Cache options */
  cache?: RequestCache;
}

/**
 * HTTP response wrapper
 */
export interface HttpResponse<T = unknown> {
  /** Response status code */
  status: number;
  /** Response status text */
  statusText: string;
  /** Response headers */
  headers: Headers;
  /** Parsed response data */
  data: T;
  /** Raw response text */
  text: string;
  /** Whether the request was successful (status 200-299) */
  ok: boolean;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Delay between requests in milliseconds */
  requestDelay?: number;
}

/**
 * Simple rate limiter
 */
class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(
      (time) => now - time < this.config.windowMs
    );

    // Check if we're at the limit
    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.config.windowMs - (now - oldestRequest);
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // Add current request
    this.requests.push(now);

    // Apply request delay if configured
    if (this.config.requestDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.requestDelay)
      );
    }
  }
}

/**
 * HTTP client class
 */
export class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;
  private rateLimiter?: RateLimiter;

  constructor(
    options: {
      baseUrl?: string;
      defaultHeaders?: Record<string, string>;
      defaultTimeout?: number;
      rateLimit?: RateLimitConfig;
    } = {}
  ) {
    this.baseUrl = options.baseUrl || "";
    this.defaultHeaders = options.defaultHeaders || {};
    this.defaultTimeout = options.defaultTimeout || 30000; // 30 seconds

    if (options.rateLimit) {
      this.rateLimiter = new RateLimiter(options.rateLimit);
    }
  }

  /**
   * Make HTTP request
   */
  async request<T = unknown>(
    url: string,
    options: RequestOptions = {}
  ): Promise<HttpResponse<T>> {
    try {
      // Apply rate limiting if configured
      if (this.rateLimiter) {
        await this.rateLimiter.waitIfNeeded();
      }

      const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
      const timeout = options.timeout || this.defaultTimeout;

      // Merge headers
      const headers = {
        ...this.defaultHeaders,
        ...options.headers,
      };

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(fullUrl, {
          method: options.method || "GET",
          headers,
          body: options.body,
          redirect: options.redirect || "follow",
          signal: controller.signal,
          cache: options.cache,
        });

        clearTimeout(timeoutId);

        const text = await response.text();
        let data: T;

        // Try to parse as JSON, fall back to text
        try {
          data = JSON.parse(text);
        } catch {
          data = text as unknown as T;
        }

        return {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data,
          text,
          ok: response.ok,
        };
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === "AbortError") {
          throw new NetworkError(
            `Request timeout after ${timeout}ms`,
            createErrorContext("request", { url: fullUrl, timeout })
          );
        }

        throw error;
      }
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }

      throw new NetworkError(
        `HTTP request failed: ${String(error)}`,
        createErrorContext("request", { url, error: String(error) })
      );
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(
    url: string,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    body?: string | object,
    options: Omit<RequestOptions, "method"> = {}
  ): Promise<HttpResponse<T>> {
    const requestBody = typeof body === "object" ? JSON.stringify(body) : body;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    return this.request<T>(url, {
      ...options,
      method: "POST",
      headers,
      ...(requestBody && { body: requestBody }),
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    body?: string | object,
    options: Omit<RequestOptions, "method"> = {}
  ): Promise<HttpResponse<T>> {
    const requestBody = typeof body === "object" ? JSON.stringify(body) : body;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    return this.request<T>(url, {
      ...options,
      method: "PUT",
      headers,
      ...(requestBody && { body: requestBody }),
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    url: string,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }

  /**
   * Download file as text
   */
  async downloadText(
    url: string,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ): Promise<string> {
    const response = await this.get<string>(url, options);
    if (!response.ok) {
      throw new NetworkError(
        `Failed to download file: ${response.status} ${response.statusText}`,
        createErrorContext("downloadText", { url, status: response.status })
      );
    }
    return response.text;
  }

  /**
   * Check if URL is accessible
   */
  async isAccessible(url: string): Promise<boolean> {
    try {
      const response = await this.request(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Create a simple API response
 */
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  statusCode = 200
): ApiResponse<T> {
  const response: ApiResponse<T> = {
    success,
    statusCode,
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (error !== undefined) {
    response.error = error;
  }

  return response;
}

/**
 * Extract rate limit information from response headers
 */
export function extractRateLimitInfo(headers: Headers): RateLimitInfo | null {
  const limit =
    headers.get("X-RateLimit-Limit") || headers.get("RateLimit-Limit");
  const remaining =
    headers.get("X-RateLimit-Remaining") || headers.get("RateLimit-Remaining");
  const reset =
    headers.get("X-RateLimit-Reset") || headers.get("RateLimit-Reset");

  if (!limit || !remaining || !reset) {
    return null;
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    resetTime: new Date(parseInt(reset, 10) * 1000),
  };
}

/**
 * Extract cache metadata from response headers
 */
export function extractCacheMetadata(headers: Headers): CacheMetadata {
  const cacheControl = headers.get("Cache-Control");
  const etag = headers.get("ETag");
  const lastModified = headers.get("Last-Modified");

  let expiresAt = new Date(Date.now() + 3600000); // Default 1 hour

  if (cacheControl) {
    const maxAge = cacheControl.match(/max-age=(\d+)/);
    if (maxAge) {
      expiresAt = new Date(Date.now() + parseInt(maxAge[1], 10) * 1000);
    }
  }

  const metadata: CacheMetadata = {
    cachedAt: new Date(),
    expiresAt,
  };

  if (etag) {
    metadata.etag = etag;
  }

  if (lastModified) {
    metadata.lastModified = lastModified;
  }

  return metadata;
}

/**
 * Default HTTP client instance
 */
export const httpClient = new HttpClient({
  defaultHeaders: {
    "User-Agent": "AlgoTrainer/2.0.0",
  },
  defaultTimeout: 30000,
});

/**
 * Create specialized HTTP client for a specific service
 */
export function createServiceClient(
  baseUrl: string,
  options: {
    headers?: Record<string, string>;
    timeout?: number;
    rateLimit?: RateLimitConfig;
  } = {}
): HttpClient {
  const clientOptions: {
    baseUrl: string;
    defaultHeaders?: Record<string, string>;
    defaultTimeout?: number;
    rateLimit?: RateLimitConfig;
  } = {
    baseUrl,
    defaultHeaders: {
      "User-Agent": "AlgoTrainer/2.0.0",
      ...options.headers,
    },
  };

  if (options.timeout !== undefined) {
    clientOptions.defaultTimeout = options.timeout;
  }

  if (options.rateLimit !== undefined) {
    clientOptions.rateLimit = options.rateLimit;
  }

  return new HttpClient(clientOptions);
}
