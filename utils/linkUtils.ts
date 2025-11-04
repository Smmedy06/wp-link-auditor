
import { Link, LinkStatus } from '../types';

export const parseLinksFromHTML = (htmlContent: string): Link[] => {
  if (typeof window === 'undefined') return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const anchorTags = Array.from(doc.querySelectorAll('a'));
  const currentHost = window.location.hostname;

  return anchorTags.map((tag, index) => {
    const href = tag.getAttribute('href') || '';
    const isExternal = (() => {
      try {
        const url = new URL(href, window.location.origin);
        return url.hostname !== currentHost;
      } catch (e) {
        // Handle invalid URLs, mailto:, tel:, etc.
        return !href.startsWith('/') && !href.startsWith('#') && !href.startsWith(window.location.origin);
      }
    })();

    return {
      id: `${Date.now()}-${index}`,
      href,
      anchorText: tag.textContent || '',
      isNofollow: (tag.getAttribute('rel') || '').includes('nofollow'),
      isNewTab: tag.getAttribute('target') === '_blank',
      isExternal,
      status: isExternal ? LinkStatus.IDLE : LinkStatus.OK,
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

    const linkElement = Array.from(doc.querySelectorAll('a')).find(a => 
        a.getAttribute('href') === originalLink.href && a.textContent === originalLink.anchorText
    );

    if (linkElement) {
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
    }

    return doc.body.innerHTML;
};


// Mock function to check link status
export const checkLinkStatus = async (link: Link): Promise<LinkStatus> => {
    if (!link.isExternal) return LinkStatus.OK;

    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
    
    // Simulate broken link check
    if (link.href.includes('thissitedoesnotexist.fail')) {
        return LinkStatus.BROKEN;
    }
    
    // Randomly fail some links for demonstration
    return Math.random() > 0.15 ? LinkStatus.OK : LinkStatus.BROKEN;
};
