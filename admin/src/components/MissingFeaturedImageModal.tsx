import React, { useState, useMemo } from 'react';
import { Post } from '../types';

interface MissingFeaturedImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
}

const POSTS_PER_PAGE = 20;

declare const wpLinkAuditor: {
  adminUrl?: string;
};

const isDevelopment = typeof wpLinkAuditor === 'undefined' || !wpLinkAuditor?.adminUrl;

export const MissingFeaturedImageModal: React.FC<MissingFeaturedImageModalProps> = ({
  isOpen,
  onClose,
  posts,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredPosts = useMemo(() => {
    if (!searchTerm) return posts;
    const term = searchTerm.toLowerCase();
    return posts.filter(post =>
      post.title.toLowerCase().includes(term) ||
      (post.url && post.url.toLowerCase().includes(term))
    );
  }, [posts, searchTerm]);

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [filteredPosts, currentPage]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleViewInWordPress = () => {
    if (isDevelopment) return;
    const postIds = filteredPosts.map(p => p.id).join(',');
    const editUrl = `${wpLinkAuditor.adminUrl}edit.php?post_type=post&post__in=${postIds}`;
    window.open(editUrl, '_blank');
    onClose();
  };

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
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        className="postbox"
        style={{
          backgroundColor: '#fff',
          padding: '24px',
          maxWidth: '900px',
          width: '90%',
          maxHeight: 'calc(100vh - 40px)',
          overflow: 'auto',
          position: 'relative',
          margin: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>
          Posts Missing Featured Images ({filteredPosts.length})
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            Search Posts:
          </label>
          <input
            type="text"
            placeholder="Search posts by title..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="regular-text"
            style={{ width: '100%', maxWidth: '400px' }}
          />
        </div>

        {paginatedPosts.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#646970', padding: '40px 20px' }}>
            {searchTerm ? 'No posts found matching your search.' : 'No posts missing featured images.'}
          </p>
        ) : (
          <div style={{ 
            marginBottom: '16px', 
            maxHeight: '400px', 
            overflowY: 'auto',
            border: '1px solid #c3c4c7',
            borderRadius: '4px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ background: '#f6f7f7', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #c3c4c7' }}>Post Title</th>
                  <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #c3c4c7', width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPosts.map((post) => (
                  <tr key={post.id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #c3c4c7' }}>
                      <strong>
                        {isDevelopment ? (
                          <span style={{ color: '#2271b1' }}>{post.title}</span>
                        ) : (
                          <a
                            href={`${wpLinkAuditor.adminUrl}post.php?post=${post.id}&action=edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none', color: '#2271b1' }}
                          >
                            {post.title}
                          </a>
                        )}
                      </strong>
                      <div style={{ fontSize: '12px', color: '#646970', marginTop: '4px' }}>
                        ID: {post.id}
                      </div>
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #c3c4c7', textAlign: 'center' }}>
                      {post.url && (
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="button button-small"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          Visit
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div
            style={{
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #dcdcde',
            }}
          >
            <div style={{ fontSize: '13px', color: '#646970' }}>
              Showing {((currentPage - 1) * POSTS_PER_PAGE) + 1} to{' '}
              {Math.min(currentPage * POSTS_PER_PAGE, filteredPosts.length)} of {filteredPosts.length} posts
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '4px 8px',
                  minWidth: 'auto',
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '13px', color: '#646970' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '4px 8px',
                  minWidth: 'auto',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {!isDevelopment && filteredPosts.length > 0 && (
            <button
              className="button"
              onClick={handleViewInWordPress}
            >
              View in WordPress Posts
            </button>
          )}
          <button
            className="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
