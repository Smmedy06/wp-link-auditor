import React, { useEffect, useMemo, useState } from 'react';
import { BulkFocusKeywordRequest, MissingFocusKeywordPost } from '../types';

interface FocusKeywordModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: MissingFocusKeywordPost[];
  seoPlugins: {
    yoast: boolean;
    rankMath: boolean;
  };
  onSave: (payload: BulkFocusKeywordRequest) => Promise<void>;
  isSaving?: boolean;
}

export const FocusKeywordModal: React.FC<FocusKeywordModalProps> = ({
  isOpen,
  onClose,
  posts,
  seoPlugins,
  onSave,
  isSaving = false,
}) => {
  const [keywords, setKeywords] = useState<Record<number, string>>({});
  const [syncYoast, setSyncYoast] = useState<boolean>(seoPlugins.yoast);
  const [syncRankMath, setSyncRankMath] = useState<boolean>(seoPlugins.rankMath);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Default to empty keywords to avoid accidental mass updates
      const defaults = posts.reduce<Record<number, string>>((acc, post) => {
        acc[post.id] = post.currentKeyword || '';
        return acc;
      }, {});
      setKeywords(defaults);
      setSyncYoast(seoPlugins.yoast);
      setSyncRankMath(!seoPlugins.yoast && seoPlugins.rankMath ? true : seoPlugins.rankMath);
      setError(null);
    }
  }, [isOpen, posts, seoPlugins]);

  const readyToSave = useMemo(() => {
    return posts.some(post => (keywords[post.id] || '').trim().length > 0);
  }, [posts, keywords]);

  if (!isOpen) {
    return null;
  }

  const handleKeywordChange = (postId: number, value: string) => {
    setKeywords(prev => ({
      ...prev,
      [postId]: value,
    }));
  };

  const handleUseTitle = (postId: number) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    handleKeywordChange(postId, post.suggestedKeyword || post.title);
  };

  const handleFillAll = () => {
    setKeywords(prev => {
      const next = { ...prev };
      posts.forEach(post => {
        next[post.id] = post.suggestedKeyword || post.title;
      });
      return next;
    });
  };

  const handleSave = async () => {
    setError(null);

    // Allow saving even if no SEO plugins are selected - will save to plugin's own meta key

    const entries = posts
      .map(post => ({
        postId: post.id,
        focusKeyword: (keywords[post.id] || '').trim(),
      }))
      .filter(entry => entry.focusKeyword.length > 0);

    if (entries.length === 0) {
      setError('Enter at least one focus keyword before saving.');
      return;
    }

    try {
      await onSave({
        keywords: entries,
        syncYoast,
        syncRankMath,
        overwriteExisting: false,
      });
      onClose();
    } catch (saveError) {
      if (saveError instanceof Error) {
        setError(saveError.message);
      } else {
        setError('Failed to save focus keywords. Please try again.');
      }
    }
  };

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
          maxWidth: '900px',
          width: '95%',
          maxHeight: 'calc(100vh - 40px)',
          overflow: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Focus Keyword Assistant</h2>
        <p style={{ marginTop: '4px', color: '#646970' }}>
          Add focus keywords to posts. If Yoast SEO or Rank Math are active, keywords will be synced with those plugins.
        </p>

        <div
          style={{
            padding: '12px',
            backgroundColor: '#f6f7f7',
            border: '1px solid #c3c4c7',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
          <strong>Active SEO plugins:</strong>{' '}
          {seoPlugins.yoast ? 'Yoast SEO' : ''}
          {seoPlugins.yoast && seoPlugins.rankMath ? ' + ' : ''}
          {seoPlugins.rankMath ? 'Rank Math' : ''}
          {!seoPlugins.yoast && !seoPlugins.rankMath && 'None detected'}
        </div>

        {posts.length === 0 ? (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#ecf7ed',
              border: '1px solid #00a32a',
              borderRadius: '4px',
              color: '#1d2327',
            }}
          >
            All published posts already have focus keywords configured.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {seoPlugins.yoast && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={syncYoast}
                    onChange={(e) => setSyncYoast(e.target.checked)}
                  />
                  Sync Yoast SEO
                </label>
              )}
              {seoPlugins.rankMath && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={syncRankMath}
                    onChange={(e) => setSyncRankMath(e.target.checked)}
                  />
                  Sync Rank Math
                </label>
              )}
              {!seoPlugins.yoast && !seoPlugins.rankMath && (
                <span style={{ color: '#646970', fontSize: '13px' }}>
                  Focus keywords will be saved to the plugin's own storage.
                </span>
              )}
              <button className="button" onClick={handleFillAll}>
                Use Post Titles for All
              </button>
              <span style={{ marginLeft: 'auto', color: '#646970', fontSize: '13px' }}>
                {posts.length} post{posts.length === 1 ? '' : 's'} without focus keywords
              </span>
            </div>

            <div
              style={{
                border: '1px solid #c3c4c7',
                borderRadius: '4px',
                maxHeight: '420px',
                overflow: 'auto',
                marginBottom: '16px',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ background: '#f0f6fc', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #c3c4c7' }}>Post</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #c3c4c7' }}>Suggested</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #c3c4c7', width: '35%' }}>Focus Keyword</th>
                    <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #c3c4c7', width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map(post => {
                    // Decode HTML entities in post title
                    const decodeHtml = (html: string) => {
                      const txt = document.createElement('textarea');
                      txt.innerHTML = html;
                      return txt.value;
                    };
                    const decodedTitle = decodeHtml(post.title);
                    
                    return (
                    <tr key={post.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px' }}>
                        <strong>{decodedTitle}</strong>
                        <div>
                          <a href={post.url} target="_blank" rel="noopener noreferrer">
                            View post ↗
                          </a>
                        </div>
                      </td>
                      <td style={{ padding: '10px', color: '#646970' }}>
                        {post.suggestedKeyword || 'Use the post title'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <input
                          type="text"
                          className="regular-text"
                          style={{ width: '100%' }}
                          value={keywords[post.id] || ''}
                          onChange={(e) => handleKeywordChange(post.id, e.target.value)}
                          placeholder="Enter keyword"
                        />
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button className="button button-small" onClick={() => handleUseTitle(post.id)}>
                          Use Title
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {error && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#fbeaea',
              border: '1px solid #d63638',
              borderRadius: '4px',
              color: '#1d2327',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            className="button button-primary"
            onClick={handleSave}
            disabled={isSaving || !posts.length || !readyToSave}
          >
            {isSaving ? 'Saving...' : `Save Keywords`}
          </button>
        </div>
      </div>
    </div>
  );
};


