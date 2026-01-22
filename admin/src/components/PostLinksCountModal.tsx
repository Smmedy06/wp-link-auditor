import React, { useState, useMemo } from 'react';
import { Post } from '../types';
import { parseLinksFromHTML } from '../utils/linkUtils';

interface PostLinksCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
}

export const PostLinksCountModal: React.FC<PostLinksCountModalProps> = ({
  isOpen,
  onClose,
  posts,
}) => {
  const [internalCountFilter, setInternalCountFilter] = useState<number | null>(null);
  const [externalCountFilter, setExternalCountFilter] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Calculate link counts for each post
  const postsWithCounts = useMemo(() => {
    return posts.map(post => {
      const links = parseLinksFromHTML(post.content, post.id);
      const internalCount = links.filter(link => !link.isExternal).length;
      const externalCount = links.filter(link => link.isExternal).length;
      const totalCount = links.length;

      return {
        ...post,
        internalCount,
        externalCount,
        totalCount,
      };
    });
  }, [posts]);

  // Filter posts based on criteria
  const filteredPosts = useMemo(() => {
    let filtered = postsWithCounts;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(term)
      );
    }

    // Internal count filter
    if (internalCountFilter !== null) {
      filtered = filtered.filter(post => post.internalCount === internalCountFilter);
    }

    // External count filter
    if (externalCountFilter !== null) {
      filtered = filtered.filter(post => post.externalCount === externalCountFilter);
    }

    return filtered;
  }, [postsWithCounts, searchTerm, internalCountFilter, externalCountFilter]);

  // Get unique counts for filter options
  const uniqueInternalCounts = useMemo(() => {
    const counts = new Set(postsWithCounts.map(p => p.internalCount));
    return Array.from(counts).sort((a, b) => a - b);
  }, [postsWithCounts]);

  const uniqueExternalCounts = useMemo(() => {
    const counts = new Set(postsWithCounts.map(p => p.externalCount));
    return Array.from(counts).sort((a, b) => a - b);
  }, [postsWithCounts]);

  if (!isOpen) return null;

  return (
    <div
      className="wp-link-auditor-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="postbox"
        style={{
          backgroundColor: '#fff',
          padding: '24px',
          maxWidth: '1000px',
          width: '95%',
          maxHeight: 'calc(100vh - 40px)',
          overflow: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>
          Post Links Count Analysis
        </h2>
        <p style={{ marginTop: '4px', marginBottom: '20px', color: '#646970' }}>
          View posts with their internal and external link counts. Filter by specific counts to find posts that need more or fewer links.
        </p>

        {/* Filters */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '20px', 
          flexWrap: 'wrap',
          padding: '16px',
          backgroundColor: '#f6f7f7',
          borderRadius: '4px',
          border: '1px solid #c3c4c7'
        }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
              Search Posts:
            </label>
            <input
              type="text"
              placeholder="Search by post title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="regular-text"
              style={{ width: '100%' }}
            />
          </div>
          
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
              Internal Links:
            </label>
            <select
              value={internalCountFilter === null ? '' : internalCountFilter}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                setInternalCountFilter(value);
              }}
              style={{ width: '100%' }}
            >
              <option value="">All</option>
              {uniqueInternalCounts.slice(0, 10).map(count => (
                <option key={count} value={count}>
                  {count} {count === 1 ? 'link' : 'links'}
                </option>
              ))}
              <option value="custom">Custom...</option>
            </select>
            {internalCountFilter === null && (
              <input
                type="number"
                min="0"
                placeholder="Or enter count..."
                onChange={(e) => {
                  const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                  if (value !== null && !isNaN(value) && value >= 0) {
                    setInternalCountFilter(value);
                  }
                }}
                style={{ 
                  width: '100%', 
                  marginTop: '6px',
                  padding: '4px 8px',
                  fontSize: '13px',
                  minHeight: '30px'
                }}
              />
            )}
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
              External Links:
            </label>
            <select
              value={externalCountFilter === null ? '' : externalCountFilter}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                setExternalCountFilter(value);
              }}
              style={{ width: '100%' }}
            >
              <option value="">All</option>
              {uniqueExternalCounts.slice(0, 10).map(count => (
                <option key={count} value={count}>
                  {count} {count === 1 ? 'link' : 'links'}
                </option>
              ))}
              <option value="custom">Custom...</option>
            </select>
            {externalCountFilter === null && (
              <input
                type="number"
                min="0"
                placeholder="Or enter count..."
                onChange={(e) => {
                  const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                  if (value !== null && !isNaN(value) && value >= 0) {
                    setExternalCountFilter(value);
                  }
                }}
                style={{ 
                  width: '100%', 
                  marginTop: '6px',
                  padding: '4px 8px',
                  fontSize: '13px',
                  minHeight: '30px'
                }}
              />
            )}
          </div>

          <div style={{ flex: '0 0 auto', alignSelf: 'flex-end' }}>
            <button
              className="button"
              onClick={() => {
                setInternalCountFilter(null);
                setExternalCountFilter(null);
                setSearchTerm('');
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div style={{ 
          marginBottom: '16px', 
          padding: '12px', 
          backgroundColor: '#f0f6fc', 
          borderRadius: '4px',
          border: '1px solid #c3c4c7'
        }}>
          <strong>
            Showing {filteredPosts.length} of {posts.length} post{posts.length === 1 ? '' : 's'}
            {(internalCountFilter !== null || externalCountFilter !== null || searchTerm) && (
              <span style={{ fontWeight: 400, color: '#646970' }}>
                {' '}(filtered)
              </span>
            )}
          </strong>
        </div>

        {/* Posts Table */}
        <div style={{ 
          maxHeight: '500px', 
          overflowY: 'auto',
          border: '1px solid #c3c4c7',
          borderRadius: '4px'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ background: '#f6f7f7', position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #c3c4c7' }}>Post Title</th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #c3c4c7', width: '100px' }}>Total Links</th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #c3c4c7', width: '120px' }}>Internal Links</th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #c3c4c7', width: '120px' }}>External Links</th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #c3c4c7', width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <tr key={post.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px' }}>
                      <strong>{post.title}</strong>
                      {post.url && (
                        <div style={{ marginTop: '4px' }}>
                          <a 
                            href={post.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ fontSize: '12px', color: '#2271b1' }}
                          >
                            View post ↗
                          </a>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{ 
                        fontSize: '16px', 
                        fontWeight: 600,
                        color: '#1d2327'
                      }}>
                        {post.totalCount}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{ 
                        fontSize: '16px', 
                        fontWeight: 600,
                        color: post.internalCount === 0 ? '#d63638' : post.internalCount <= 1 ? '#dba617' : '#00a32a'
                      }}>
                        {post.internalCount}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{ 
                        fontSize: '16px', 
                        fontWeight: 600,
                        color: '#2271b1'
                      }}>
                        {post.externalCount}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {typeof (window as any).wpLinkAuditor !== 'undefined' && (window as any).wpLinkAuditor?.adminUrl && (
                        <a
                          href={`${(window as any).wpLinkAuditor.adminUrl}post.php?post=${post.id}&action=edit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="button button-small"
                        >
                          Edit Post
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#646970' }}>
                    No posts found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          <button className="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
