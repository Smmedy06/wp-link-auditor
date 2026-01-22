import { Post, FocusKeywordAuditResponse, BulkFocusKeywordRequest, BulkFocusKeywordResponse } from '../types';
import { mockPosts, mockMissingFocusKeywords } from './mockData';

declare const wpLinkAuditor: {
  apiUrl: string;
  nonce: string;
  siteUrl: string;
};

const isDevelopment = typeof wpLinkAuditor === 'undefined' || !wpLinkAuditor.apiUrl || wpLinkAuditor.apiUrl.includes('localhost');

export const fetchPosts = async (): Promise<Post[]> => {
  // Use mock data in development
  if (isDevelopment) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    return mockPosts;
  }

  // Check if wpLinkAuditor is available
  if (typeof wpLinkAuditor === 'undefined' || !wpLinkAuditor.apiUrl) {
    console.error('WP Link Auditor: API configuration not available');
    throw new Error('API configuration not available');
  }

  try {
    const response = await fetch(`${wpLinkAuditor.apiUrl}posts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': wpLinkAuditor.nonce || '',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const posts = await response.json();
    return Array.isArray(posts) ? posts : [];
  } catch (error) {
    console.error('WP Link Auditor: Error fetching posts:', error);
    throw error;
  }
};

export const updatePost = async (postId: number, content: string, focusKeyphrase?: string): Promise<Post> => {
  // Use mock data in development
  if (isDevelopment) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const post = mockPosts.find(p => p.id === postId);
    if (post) {
      return { ...post, content, focusKeyphrase };
    }
    throw new Error('Post not found');
  }

  // Check if wpLinkAuditor is available
  if (typeof wpLinkAuditor === 'undefined' || !wpLinkAuditor.apiUrl) {
    console.error('WP Link Auditor: API configuration not available');
    throw new Error('API configuration not available');
  }

  try {
    const body: any = { content };
    if (focusKeyphrase !== undefined) {
      body.focusKeyphrase = focusKeyphrase;
    }

    const response = await fetch(`${wpLinkAuditor.apiUrl}posts/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': wpLinkAuditor.nonce || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    const post = await response.json();
    return post;
  } catch (error) {
    console.error('WP Link Auditor: Error updating post:', error);
    throw error;
  }
};

export const checkLinkStatus = async (url: string): Promise<'ok' | 'broken'> => {
  // Use mock checking in development
  if (isDevelopment) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Simulate broken link check
    if (url.includes('broken') || url.includes('.fail')) {
      return 'broken';
    }
    return 'ok';
  }

  // Check if wpLinkAuditor is available
  if (typeof wpLinkAuditor === 'undefined' || !wpLinkAuditor.apiUrl) {
    console.error('WP Link Auditor: API configuration not available');
    return 'broken';
  }

  try {
    const response = await fetch(`${wpLinkAuditor.apiUrl}check-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': wpLinkAuditor.nonce || '',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract JSON from response if it has warnings
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response');
      }
    }

    const status = data.status || 'broken';
    return status;
  } catch (error) {
    return 'broken';
  }
};

export const fetchMissingFocusKeywords = async (): Promise<FocusKeywordAuditResponse> => {
  if (isDevelopment) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockMissingFocusKeywords;
  }

  // Check if wpLinkAuditor is available
  if (typeof wpLinkAuditor === 'undefined' || !wpLinkAuditor.apiUrl) {
    console.error('WP Link Auditor: API configuration not available');
    return {
      seoPlugins: { yoast: false, rankMath: false },
      missing: [],
      total: 0,
    };
  }

  try {
    const response = await fetch(`${wpLinkAuditor.apiUrl}seo/focus-keywords/missing`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': wpLinkAuditor.nonce || '',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('WP Link Auditor: Error fetching missing focus keywords:', error);
    return {
      seoPlugins: { yoast: false, rankMath: false },
      missing: [],
      total: 0,
    };
  }
};

export const bulkUpdateFocusKeywords = async (payload: BulkFocusKeywordRequest): Promise<BulkFocusKeywordResponse> => {
  if (isDevelopment) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      updated: payload.keywords.map(keyword => keyword.postId),
      skipped: [],
      remaining: Math.max(mockMissingFocusKeywords.total - payload.keywords.length, 0),
      missing: [],
    };
  }

  // Check if wpLinkAuditor is available
  if (typeof wpLinkAuditor === 'undefined' || !wpLinkAuditor.apiUrl) {
    console.error('WP Link Auditor: API configuration not available');
    throw new Error('API configuration not available');
  }

  try {
    const response = await fetch(`${wpLinkAuditor.apiUrl}seo/focus-keywords/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': wpLinkAuditor.nonce || '',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('WP Link Auditor: Error bulk updating focus keywords:', error);
    throw error;
  }
};

