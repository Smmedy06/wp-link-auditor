import { Link, LinkStatus } from '../types';
import { checkLinkStatus as checkLinkStatusAPI } from '../services/wordpressService';

declare const wpLinkAuditor: {
  siteUrl: string;
};

const isDevelopment = typeof wpLinkAuditor === 'undefined' || !wpLinkAuditor.siteUrl || wpLinkAuditor.siteUrl.includes('localhost');

export const parseLinksFromHTML = (htmlContent: string, postId?: number): Link[] => {
  if (typeof window === 'undefined') return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const anchorTags = Array.from(doc.querySelectorAll('a'));
  
  // Get site URL from WordPress
  const siteUrl = isDevelopment ? new URL('http://localhost') : new URL(wpLinkAuditor.siteUrl);
  const currentHost = siteUrl.hostname;

  return anchorTags.map((tag, index) => {
    const href = tag.getAttribute('href') || '';
    
    // Use existing data-link-id if it exists, otherwise generate a new one
    // IMPORTANT: Each link instance needs a unique ID, even if URLs are the same
    // The index ensures uniqueness within a post, and postId ensures uniqueness across posts
    let linkId = tag.getAttribute('data-link-id');
    if (!linkId) {
      // Generate a unique ID using postId and index
      // Index is always unique within a post, so this guarantees uniqueness
      const baseId = postId !== undefined 
        ? `post-${postId}-link-${index}` 
        : `link-${Date.now()}-${index}`;
      linkId = baseId;
      // Set it on the tag (though this won't persist until we save)
      tag.setAttribute('data-link-id', linkId);
    }
    
    const isExternal = (() => {
      try {
        const baseUrl = isDevelopment ? 'http://localhost' : wpLinkAuditor.siteUrl;
        const url = new URL(href, baseUrl);
        return url.hostname !== currentHost && url.hostname !== '';
      } catch (e) {
        // Handle invalid URLs, mailto:, tel:, etc.
        const baseUrl = isDevelopment ? 'http://localhost' : wpLinkAuditor.siteUrl;
        return !href.startsWith('/') && !href.startsWith('#') && !href.startsWith(baseUrl);
      }
    })();

    // Get status from data attribute if it exists, otherwise default
    const statusAttr = tag.getAttribute('data-link-status');
    let status: LinkStatus;
    if (statusAttr && Object.values(LinkStatus).includes(statusAttr as LinkStatus)) {
      status = statusAttr as LinkStatus;
    } else {
      status = isExternal ? LinkStatus.IDLE : LinkStatus.OK;
    }

    return {
      id: linkId,
      href,
      anchorText: tag.textContent || '',
      isNofollow: (tag.getAttribute('rel') || '').includes('nofollow'),
      isNewTab: tag.getAttribute('target') === '_blank',
      isExternal,
      status,
    };
  });
};

export const updatePostContentWithLinkChanges = (
  originalContent: string,
  originalLink: Link,
  updatedLink: Link
): string => {
    if (typeof window === 'undefined') return originalContent;
    const parser = new DOMParser();
    const doc = parser.parseFromString(originalContent, 'text/html');

    // Find ALL links with matching data-link-id (handles duplicates properly)
    // Each link instance should have its own unique ID, so this should match exactly one
    const linkElements = Array.from(doc.querySelectorAll('a')).filter(a => 
        a.getAttribute('data-link-id') === originalLink.id
    );

    // If no match by data-link-id, try fallback matching
    // But we need to be careful - if there are multiple links with same href+text, 
    // we should only update the one that matches our specific link instance
    if (linkElements.length === 0) {
        // Find by href + anchor text, but we need to match the specific instance
        // Use a combination of href, anchor text, and position to identify unique instances
        const allMatchingLinks = Array.from(doc.querySelectorAll('a')).filter(a => 
            a.getAttribute('href') === originalLink.href && a.textContent === originalLink.anchorText
        );
        
        // If we have multiple matches, we can't reliably identify which one to update
        // So we'll update the first one and assign it the data-link-id
        if (allMatchingLinks.length > 0) {
            const linkElement = allMatchingLinks[0];
            linkElement.setAttribute('data-link-id', originalLink.id);
            linkElements.push(linkElement);
        }
    }

    // Update all matching link elements (should typically be just one)
    linkElements.forEach(linkElement => {
        // Update href if changed
        if (updatedLink.href && updatedLink.href !== originalLink.href) {
            linkElement.setAttribute('href', updatedLink.href);
        }

        if (updatedLink.isNewTab) {
            linkElement.setAttribute('target', '_blank');
        } else {
            linkElement.removeAttribute('target');
        }

        let rel = linkElement.getAttribute('rel') || '';
        let relParts = rel.split(' ').filter(part => part && part !== 'nofollow' && part !== 'external' && part !== 'noopener' && part !== 'noreferrer');

        if (updatedLink.isNofollow) {
            relParts.push('nofollow');
        }
        if (updatedLink.isExternal) {
            relParts.push('external');
            // It's good practice to add these for security with target="_blank"
             if (updatedLink.isNewTab) {
                relParts.push('noopener', 'noreferrer');
             }
        }
        
        const newRel = Array.from(new Set(relParts)).join(' ').trim();
        if (newRel) {
            linkElement.setAttribute('rel', newRel);
        } else {
            linkElement.removeAttribute('rel');
        }

        // Store link status in data attribute - each link instance gets its own status
        if (updatedLink.status !== undefined) {
            linkElement.setAttribute('data-link-status', updatedLink.status);
        }
        
        // Ensure data-link-id is saved (critical for matching on next parse)
        if (!linkElement.getAttribute('data-link-id')) {
            linkElement.setAttribute('data-link-id', originalLink.id);
        }
    });

    return doc.body.innerHTML;
};

// Replace URLs in post content (find and replace)
export const replaceUrlsInContent = (
  content: string,
  findUrl: string,
  replaceUrl: string
): string => {
  if (typeof window === 'undefined') return content;
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  
  const links = Array.from(doc.querySelectorAll('a'));
  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    // Use exact match or check if URL starts with findUrl to avoid false matches
    if (href === findUrl || (findUrl && href.startsWith(findUrl) && (href.length === findUrl.length || href[findUrl.length] === '/' || href[findUrl.length] === '?' || href[findUrl.length] === '#'))) {
      const newHref = href.replace(findUrl, replaceUrl);
      link.setAttribute('href', newHref);
    }
  });

  return doc.body.innerHTML;
};

// Replace URL for a single specific link by its ID
export const replaceSingleUrlInContent = (
  content: string,
  linkId: string,
  findUrl: string,
  replaceUrl: string
): string => {
  if (typeof window === 'undefined') return content;
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  
  // Find the specific link by data-link-id
  const linkElement = Array.from(doc.querySelectorAll('a')).find(a => 
    a.getAttribute('data-link-id') === linkId
  );

  if (linkElement) {
    const href = linkElement.getAttribute('href') || '';
    // Use exact match or check if URL starts with findUrl to avoid false matches
    if (href === findUrl || (findUrl && href.startsWith(findUrl) && (href.length === findUrl.length || href[findUrl.length] === '/' || href[findUrl.length] === '?' || href[findUrl.length] === '#'))) {
      const newHref = href.replace(findUrl, replaceUrl);
      linkElement.setAttribute('href', newHref);
    }
  }

  return doc.body.innerHTML;
};

// Remove all data-link-status attributes from post content
export const clearAllLinkStatuses = (content: string): string => {
  if (typeof window === 'undefined') return content;
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  
  const links = Array.from(doc.querySelectorAll('a'));
  links.forEach((link, index) => {
    link.removeAttribute('data-link-status');
    // Also ensure data-link-id exists for future matching
    if (!link.getAttribute('data-link-id')) {
      const href = link.getAttribute('href') || '';
      const baseId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      link.setAttribute('data-link-id', `${baseId}-${index}`);
    }
  });

  return doc.body.innerHTML;
};

// Check link status using WordPress API
export const checkLinkStatus = async (link: Link): Promise<LinkStatus> => {
    if (!link.isExternal) return LinkStatus.OK;

    try {
        const status = await checkLinkStatusAPI(link.href);
        return status === 'ok' ? LinkStatus.OK : LinkStatus.BROKEN;
    } catch (error) {
        console.error('Error checking link status:', error);
        return LinkStatus.BROKEN;
    }
};
