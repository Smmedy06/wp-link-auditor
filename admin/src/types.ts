export interface Post {
  id: number;
  title: string;
  content: string;
  date: string;
  lastModified?: string;
  url?: string;
  hasFeaturedImage?: boolean;
  featuredImage?: string | null;
  focusKeyphrase?: string;
  seoFocusKeywords?: {
    yoast?: string | null;
    rankMath?: string | null;
  };
}

export interface Link {
  id: string;
  href: string;
  anchorText: string;
  isNofollow: boolean;
  isNewTab: boolean;
  isExternal: boolean;
  status: LinkStatus;
}

export enum LinkStatus {
  IDLE = 'idle',
  CHECKING = 'checking',
  OK = 'ok',
  BROKEN = 'broken',
}

export enum SortOrder {
  NEWEST = 'newest',
  OLDEST = 'oldest',
}

export interface MissingFocusKeywordPost {
  id: number;
  title: string;
  url: string;
  suggestedKeyword?: string;
  currentKeyword?: string | null;
}

export interface FocusKeywordAuditResponse {
  seoPlugins: {
    yoast: boolean;
    rankMath: boolean;
  };
  missing: MissingFocusKeywordPost[];
  total: number;
}

export interface BulkFocusKeywordRequest {
  keywords: Array<{
    postId: number;
    focusKeyword: string;
  }>;
  syncYoast?: boolean;
  syncRankMath?: boolean;
  overwriteExisting?: boolean;
}

export interface BulkFocusKeywordResponse {
  updated: number[];
  skipped: number[];
  remaining: number;
  missing: MissingFocusKeywordPost[];
}

