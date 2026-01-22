import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchPosts, fetchMissingFocusKeywords, bulkUpdateFocusKeywords } from '../services/wordpressService';
import { Post, SortOrder, LinkStatus, Link, FocusKeywordAuditResponse, BulkFocusKeywordRequest } from '../types';
import { SpinnerIcon } from './Icons';
import { parseLinksFromHTML } from '../utils/linkUtils';
import { LinksView } from './LinksView';
import { FocusKeywordModal } from './FocusKeywordModal';
import { MissingFeaturedImageModal } from './MissingFeaturedImageModal';
import { PostLinksCountModal } from './PostLinksCountModal';

const DEFAULT_LINKS_PER_PAGE = 20;

export const Dashboard: React.FC = () => {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.NEWEST);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [linksPerPage, setLinksPerPage] = useState<number>(DEFAULT_LINKS_PER_PAGE);
  const [filterType, setFilterType] = useState<'all' | 'external' | 'internal' | 'broken' | 'nofollow'>('all');
  const [viewMode, setViewMode] = useState<'posts' | 'links'>('links'); // New: links view mode

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const posts = await fetchPosts();
      setAllPosts(posts);
    } catch (error) {
      // Could add UI notification
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const [focusAudit, setFocusAudit] = useState<FocusKeywordAuditResponse | null>(null);
  const [focusAuditLoading, setFocusAuditLoading] = useState<boolean>(true);
  const [focusAuditError, setFocusAuditError] = useState<string | null>(null);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [isSavingFocusKeywords, setIsSavingFocusKeywords] = useState(false);
  const [isMissingFeaturedImageModalOpen, setIsMissingFeaturedImageModalOpen] = useState(false);
  const [isPostLinksCountModalOpen, setIsPostLinksCountModalOpen] = useState(false);

  const loadFocusAudit = useCallback(async () => {
    setFocusAuditLoading(true);
    try {
      const data = await fetchMissingFocusKeywords();
      setFocusAudit(data);
      setFocusAuditError(null);
    } catch (error) {
      setFocusAudit(null);
      setFocusAuditError(error instanceof Error ? error.message : 'Unable to load focus keyword data.');
    } finally {
      setFocusAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFocusAudit();
  }, [loadFocusAudit]);

  const handleUpdatePost = useCallback((updatedPost: Post) => {
    setAllPosts(prevPosts =>
      prevPosts.map(p => (p.id === updatedPost.id ? updatedPost : p))
    );
  }, []);

  // Extract all links from all posts
  const allLinks = useMemo(() => {
    const links: Array<Link & { postId: number; postTitle: string }> = [];
    allPosts.forEach(post => {
      const postLinks = parseLinksFromHTML(post.content, post.id);
      postLinks.forEach((link) => {
        links.push({
          ...link,
          postId: post.id,
          postTitle: post.title,
        });
      });
    });
    return links;
  }, [allPosts]);

  // Calculate statistics
  const statistics = useMemo(() => {
    let totalLinks = 0;
    let totalInternal = 0;
    let totalExternal = 0;
    let brokenLinks = 0;
    let postsWithLinks = 0;
    let nofollowLinks = 0;

    allPosts.forEach(post => {
      const links = parseLinksFromHTML(post.content, post.id);
      if (links.length > 0) postsWithLinks++;
      totalLinks += links.length;
      links.forEach(link => {
        if (link.isExternal) {
          totalExternal++;
          if (link.status === LinkStatus.BROKEN) brokenLinks++;
        } else {
          totalInternal++;
        }
        if (link.isNofollow) nofollowLinks++;
      });
    });

    return {
      totalPosts: allPosts.length,
      postsWithLinks,
      totalLinks,
      totalInternal,
      totalExternal,
      brokenLinks,
      nofollowLinks,
    };
  }, [allPosts]);

  // Filter links based on filter type
  const filteredLinks = useMemo(() => {
    let filtered = allLinks;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(link =>
        link.anchorText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.href.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.postTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'external':
        filtered = filtered.filter(link => link.isExternal);
        break;
      case 'internal':
        filtered = filtered.filter(link => !link.isExternal);
        break;
      case 'broken':
        filtered = filtered.filter(link => link.status === LinkStatus.BROKEN);
        break;
      case 'nofollow':
        filtered = filtered.filter(link => link.isNofollow);
        break;
      default:
        // 'all' - no filter
        break;
    }

    return filtered;
  }, [allLinks, searchTerm, filterType]);

  const paginatedLinks = useMemo(() => {
    const startIndex = (currentPage - 1) * linksPerPage;
    return filteredLinks.slice(startIndex, startIndex + linksPerPage);
  }, [filteredLinks, currentPage, linksPerPage]);
  
  const totalPages = Math.ceil(filteredLinks.length / linksPerPage);

  const handleLinksPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPerPage = parseInt(e.target.value, 10);
    setLinksPerPage(newPerPage);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleBulkFocusSave = async (payload: BulkFocusKeywordRequest) => {
    setIsSavingFocusKeywords(true);
    try {
      await bulkUpdateFocusKeywords(payload);
      await Promise.all([loadPosts(), loadFocusAudit()]);
    } finally {
      setIsSavingFocusKeywords(false);
    }
  };

  const handleExportFocusCsv = useCallback(() => {
    const rows = [
      ['Post Title', 'Post ID', 'URL', 'Focus Keyword', 'Yoast Focus', 'Rank Math Focus', 'Last Modified', 'Has Featured Image'].join(','),
      ...allPosts.map(post => {
        const url = post.url || '';
        const focus = post.focusKeyphrase || '';
        const yoast = post.seoFocusKeywords?.yoast ?? '';
        const rankMath = post.seoFocusKeywords?.rankMath ?? '';
        const hasImage = post.hasFeaturedImage ? 'Yes' : 'No';
        const lastModified = post.lastModified 
          ? new Date(post.lastModified).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
          : '';
        return [
          `"${post.title.replace(/"/g, '""')}"`,
          post.id,
          `"${url.replace(/"/g, '""')}"`,
          `"${focus.replace(/"/g, '""')}"`,
          `"${yoast.replace(/"/g, '""')}"`,
          `"${rankMath.replace(/"/g, '""')}"`,
          `"${lastModified.replace(/"/g, '""')}"`,
          hasImage,
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `link-auditor-focus-keywords-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [allPosts]);

  const missingFocusCount = focusAudit?.missing.length ?? 0;
  const seoPlugins = focusAudit?.seoPlugins ?? { yoast: false, rankMath: false };
  const hasSeoPlugin = seoPlugins.yoast || seoPlugins.rankMath;
  const missingFeaturedPosts = useMemo(
    () => allPosts.filter(post => post.hasFeaturedImage === false),
    [allPosts]
  );
  // Allow focus keywords even without SEO plugins

  if (loading) {
    return (
      <div className="wrap">
        <div className="wp-link-auditor-loading" style={{ textAlign: 'center', padding: '40px' }}>
          <SpinnerIcon className="w-8 h-8" style={{ margin: '0 auto', color: '#2271b1' }} />
          <p style={{ marginTop: '16px', color: '#646970' }}>Loading posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <h1 className="wp-heading-inline">Link Auditor</h1>
      <a href="#" className="page-title-action" onClick={(e) => { e.preventDefault(); setViewMode(viewMode === 'links' ? 'posts' : 'links'); }}>
        {viewMode === 'links' ? 'View by Posts' : 'View by Links'}
      </a>
      <hr className="wp-header-end" style={{ clear: 'both' }} />

      {/* SEO Alerts */}
      {(missingFeaturedPosts.length > 0) && (
        <div className="postbox" style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fffbe6', borderColor: '#ffb900' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong style={{ color: '#a16800', display: 'block', marginBottom: '4px' }}>
                {missingFeaturedPosts.length} post{missingFeaturedPosts.length === 1 ? '' : 's'} are missing a featured image.
              </strong>
              <p style={{ margin: 0, color: '#444', fontSize: '13px' }}>
                Add featured images to improve click-through and SEO. Export CSV below to track rankings.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="button"
                onClick={() => setIsMissingFeaturedImageModalOpen(true)}
                style={{ whiteSpace: 'nowrap' }}
              >
                View in Modal
              </button>
              {typeof (window as any).wpLinkAuditor !== 'undefined' && (window as any).wpLinkAuditor?.adminUrl && (
                <button
                  className="button"
                  onClick={() => {
                    const missingIds = missingFeaturedPosts.map(p => p.id).join(',');
                    const editUrl = `${(window as any).wpLinkAuditor.adminUrl}edit.php?post_type=post&post__in=${missingIds}`;
                    window.open(editUrl, '_blank');
                  }}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  View in WordPress
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Links Count Analysis Button */}
      <div className="postbox" style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#f0f6fc', borderColor: '#2271b1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>Post Links Count Analysis</h3>
            <p style={{ margin: 0, color: '#646970', fontSize: '13px' }}>
              View posts with their internal and external link counts. Filter by specific counts to identify posts that need more or fewer links.
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={() => setIsPostLinksCountModalOpen(true)}
          >
            View Post Links Count
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="wp-link-auditor-stats" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
        gap: '12px', 
        marginBottom: '20px',
        clear: 'both'
      }}>
        <div className="postbox" style={{ padding: '12px', textAlign: 'center', margin: 0 }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 600, color: '#1d2327' }}>
            Total Posts
          </h3>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#2271b1' }}>
            {statistics.totalPosts}
          </p>
        </div>
        <div className="postbox" style={{ padding: '12px', textAlign: 'center', margin: 0 }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 600, color: '#1d2327' }}>
            Total Links
          </h3>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#2271b1' }}>
            {statistics.totalLinks}
          </p>
        </div>
        <div className="postbox" style={{ padding: '12px', textAlign: 'center', margin: 0 }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 600, color: '#1d2327' }}>
            External Links
          </h3>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#d63638' }}>
            {statistics.totalExternal}
          </p>
        </div>
        <div className="postbox" style={{ padding: '12px', textAlign: 'center', margin: 0 }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 600, color: '#1d2327' }}>
            Internal Links
          </h3>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#00a32a' }}>
            {statistics.totalInternal}
          </p>
        </div>
        <div className="postbox" style={{ padding: '12px', textAlign: 'center', margin: 0 }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 600, color: '#1d2327' }}>
            Broken Links
          </h3>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: statistics.brokenLinks > 0 ? '#d63638' : '#00a32a' }}>
            {statistics.brokenLinks}
          </p>
        </div>
        <div className="postbox" style={{ padding: '12px', textAlign: 'center', margin: 0 }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 600, color: '#1d2327' }}>
            Nofollow Links
          </h3>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#646970' }}>
            {statistics.nofollowLinks}
          </p>
        </div>
      </div>

      {/* Focus Keyword Assistant */}
      <div className="postbox" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 auto' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Focus Keyword Assistant</h2>
            <p style={{ margin: 0, color: '#646970', fontSize: '13px' }}>
              Detect posts missing focus keywords and sync them with Yoast SEO or Rank Math.
            </p>
            {!hasSeoPlugin && (
              <p style={{ marginTop: '8px', color: '#646970', fontSize: '13px' }}>
                No SEO plugins detected. Focus keywords will be saved to the plugin's own storage. Install Yoast SEO or Rank Math to sync with those plugins.
              </p>
            )}
            {focusAuditError && (
              <p style={{ marginTop: '8px', color: '#d63638', fontSize: '13px' }}>
                {focusAuditError}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <button
              className="button"
              onClick={handleExportFocusCsv}
              style={{ marginRight: '8px' }}
              title="Export all posts with focus keywords, featured images status, and SEO data"
            >
              Export Focus CSV
            </button>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#646970', fontStyle: 'italic' }}>
              Includes all posts with focus keywords and featured image status
            </p>
            <div style={{ fontSize: '13px', marginBottom: '6px', color: '#1d2327' }}>
              {focusAuditLoading ? 'Scanning posts…' : `${missingFocusCount} post${missingFocusCount === 1 ? '' : 's'} need keywords`}
            </div>
            <button
              className="button button-primary"
              onClick={() => setIsFocusModalOpen(true)}
              disabled={focusAuditLoading || missingFocusCount === 0}
            >
              {focusAuditLoading
                ? 'Scanning...'
                : missingFocusCount === 0
                  ? 'All Set'
                  : 'Add Focus Keywords'}
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="tablenav top">
        <div className="alignleft actions bulkactions">
          <select 
            value={filterType} 
            onChange={(e) => { 
              setFilterType(e.target.value as any);
              setCurrentPage(1); 
            }}
            style={{ marginRight: '8px' }}
          >
            <option value="all">All Links</option>
            <option value="external">External Links Only</option>
            <option value="internal">Internal Links Only</option>
            <option value="broken">Broken Links Only</option>
            <option value="nofollow">Nofollow Links Only</option>
          </select>
          <span className="displaying-num" style={{ marginLeft: '8px' }}>
            {filteredLinks.length} {filteredLinks.length === 1 ? 'link' : 'links'}
          </span>
        </div>
        <div className="alignright" style={{ marginLeft: 'auto' }}>
          <p className="search-box" style={{ margin: 0 }}>
            <label className="screen-reader-text" htmlFor="link-search-input">Search Links:</label>
            <input
              type="search"
              id="link-search-input"
              name="s"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by URL, anchor text, or post title..."
              style={{ width: '300px' }}
            />
          </p>
        </div>
        <br className="clear" />
      </div>

      {/* Links View - Main Feature */}
      <div style={{ marginTop: '20px' }}>
        {viewMode === 'links' ? (
          <LinksView 
            links={paginatedLinks}
            allPosts={allPosts}
            onUpdatePost={handleUpdatePost}
          />
        ) : (
          <div style={{ color: '#646970', padding: '20px', textAlign: 'center' }}>
            Post view coming soon. Use "View by Links" for direct link editing.
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredLinks.length > 0 && (
        <div className="tablenav bottom">
          <div className="alignleft">
            <span className="displaying-num">
              Showing {((currentPage - 1) * linksPerPage) + 1} to {Math.min(currentPage * linksPerPage, filteredLinks.length)} of {filteredLinks.length} {filteredLinks.length === 1 ? 'link' : 'links'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
              <label htmlFor="links-per-page" style={{ fontSize: '13px', color: '#646970', margin: 0 }}>
                Links per page:
              </label>
              <select
                id="links-per-page"
                value={linksPerPage}
                onChange={handleLinksPerPageChange}
                style={{ padding: '4px 24px 4px 8px', fontSize: '13px', minHeight: '30px' }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value={filteredLinks.length}>All</option>
              </select>
            </span>
          </div>
          {totalPages > 1 && (
            <div className="tablenav-pages">
              <span className="pagination-links">
                <button
                  className="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{ marginRight: '4px' }}
                  title="First page"
                >
                  «
                </button>
                <button
                  className="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ marginRight: '4px' }}
                  title="Previous page"
                >
                  ‹
                </button>
                <span className="paging-input">
                  <span className="tablenav-paging-text">
                    Page <span className="current-page">{currentPage}</span> of <span className="total-pages">{totalPages}</span>
                  </span>
                </span>
                <button
                  className="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ marginLeft: '4px' }}
                  title="Next page"
                >
                  ›
                </button>
                <button
                  className="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{ marginLeft: '4px' }}
                  title="Last page"
                >
                  »
                </button>
              </span>
            </div>
          )}
          <br className="clear" />
        </div>
      )}

      <FocusKeywordModal
        isOpen={isFocusModalOpen}
        onClose={() => setIsFocusModalOpen(false)}
        posts={focusAudit?.missing || []}
        seoPlugins={seoPlugins}
        onSave={handleBulkFocusSave}
        isSaving={isSavingFocusKeywords}
      />

      <MissingFeaturedImageModal
        isOpen={isMissingFeaturedImageModalOpen}
        onClose={() => setIsMissingFeaturedImageModalOpen(false)}
        posts={missingFeaturedPosts}
      />

      <PostLinksCountModal
        isOpen={isPostLinksCountModalOpen}
        onClose={() => setIsPostLinksCountModalOpen(false)}
        posts={allPosts}
      />
    </div>
  );
};
