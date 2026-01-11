/**
 * External API type definitions
 *
 * Types for external services and APIs used by the application.
 *
 * @module types/external
 */

/**
 * LeetCode API problem response
 */
export interface LeetCodeProblem {
  questionId: string;
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  content: string;
  difficulty: string;
  likes: number;
  dislikes: number;
  isLiked?: boolean;
  similarQuestions: string;
  exampleTestcases: string;
  categoryTitle: string;
  contributors: Array<{
    username: string;
    profileUrl: string;
    avatarUrl: string;
  }>;
  topicTags: Array<{
    name: string;
    slug: string;
    translatedName?: string;
  }>;
  companyTagStats?: string;
  stats: string;
  hints: string[];
  solution?: {
    id: string;
    canSeeDetail: boolean;
    paidOnly: boolean;
    hasVideoSolution: boolean;
    paidOnlyVideo: boolean;
  };
}

/**
 * LeetCode API response wrapper
 */
export interface LeetCodeApiResponse<T> {
  data: {
    question: T;
  };
}

/**
 * GitHub API error response
 */
export interface GitHubApiError {
  message: string;
  documentation_url?: string;
}

/**
 * HTTP response type for external APIs
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
}

/**
 * Cache metadata for external API responses
 */
export interface CacheMetadata {
  cachedAt: Date;
  expiresAt: Date;
  etag?: string;
  lastModified?: string;
}
