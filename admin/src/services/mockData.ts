// Mock data for development preview
import { Post, FocusKeywordAuditResponse } from '../types';

export const mockPosts: Post[] = [
  {
    id: 1,
    title: 'Crafting Captivating Headlines: Your awesome post title goes here',
    content: '<p>This is a sample post with <a href="https://example.com">an external link</a> and <a href="/about">an internal link</a>.</p><p>Another paragraph with <a href="https://broken-link-test.fail" target="_blank" rel="nofollow">a broken link</a>.</p>',
    date: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    focusKeyphrase: 'headlines',
  },
  {
    id: 2,
    title: 'The Art of Drawing Readers In: Your attractive post title goes here',
    content: '<p>This post has <a href="https://wordpress.org">WordPress link</a> and <a href="/contact">contact page</a>.</p>',
    date: new Date(Date.now() - 86400000).toISOString(),
    lastModified: new Date(Date.now() - 43200000).toISOString(), // Modified 12 hours after publish
  },
  {
    id: 3,
    title: 'SEO Best Practices for WordPress',
    content: '<p>Learn about <a href="https://moz.com" target="_blank">SEO strategies</a> and <a href="/blog">our blog</a>.</p>',
    date: new Date(Date.now() - 172800000).toISOString(),
    lastModified: new Date(Date.now() - 86400000).toISOString(), // Modified 1 day ago
    focusKeyphrase: 'WordPress SEO',
  },
];

export const mockMissingFocusKeywords: FocusKeywordAuditResponse = {
  seoPlugins: {
    yoast: true,
    rankMath: false,
  },
  missing: [
    {
      id: 2,
      title: 'The Art of Drawing Readers In: Your attractive post title goes here',
      url: 'https://example.com/post-2',
      suggestedKeyword: 'Drawing Readers In',
      currentKeyword: null,
    },
  ],
  total: 1,
};

