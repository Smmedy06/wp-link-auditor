
export interface Post {
  id: number;
  title: string;
  content: string;
  date: string;
  focusKeyphrase?: string;
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