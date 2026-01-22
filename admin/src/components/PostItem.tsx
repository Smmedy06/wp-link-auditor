import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Post, Link } from '../types';
import { parseLinksFromHTML, updatePostContentWithLinkChanges } from '../utils/linkUtils';
import { LinkTable } from './LinkTable';
import { ChevronDownIcon, ExternalLinkIcon, InternalLinkIcon, KeyIcon } from './Icons';
import { updatePost } from '../services/wordpressService';

declare const wpLinkAuditor: {
  adminUrl?: string;
};

const isDevelopment = typeof wpLinkAuditor === 'undefined' || !wpLinkAuditor?.adminUrl;

interface PostItemProps {
  post: Post;
  onUpdatePost: (post: Post) => void;
}

export const PostItem: React.FC<PostItemProps> = ({ post, onUpdatePost }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [links, setLinks] = useState<Link[]>([]);
  const [keyphrase, setKeyphrase] = useState(post.focusKeyphrase || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLinks(parseLinksFromHTML(post.content, post.id));
  }, [post.content, post.id]);

  const isKeyphraseDirty = keyphrase !== (post.focusKeyphrase || '');

  const { internalCount, externalCount, brokenCount } = useMemo(() => {
    return links.reduce(
      (counts, link) => {
        if (link.isExternal) {
          counts.externalCount++;
          if (link.status === 'broken') counts.brokenCount++;
        } else {
          counts.internalCount++;
        }
        return counts;
      },
      { internalCount: 0, externalCount: 0, brokenCount: 0 }
    );
  }, [links]);
  
  const handleLinkUpdate = useCallback(async (originalLink: Link, updatedLink: Link) => {
    const newContent = updatePostContentWithLinkChanges(post.content, originalLink, updatedLink);
    try {
      setIsSaving(true);
      const updatedPost = await updatePost(post.id, newContent, post.focusKeyphrase);
      onUpdatePost(updatedPost);
      setLinks(parseLinksFromHTML(newContent, post.id));
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [post, onUpdatePost]);

  const handleKeyphraseSave = async () => {
    if (isKeyphraseDirty) {
      try {
        setIsSaving(true);
        const updatedPost = await updatePost(post.id, post.content, keyphrase);
        onUpdatePost(updatedPost);
      } catch (error) {
        console.error('Error updating keyphrase:', error);
        alert('Failed to save keyphrase. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const postDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const lastModifiedDate = post.lastModified 
    ? new Date(post.lastModified).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null;

  return (
    <div className="postbox" style={{ marginBottom: '16px' }}>
      <div className="postbox-header" style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #c3c4c7',
        cursor: 'pointer'
      }} onClick={() => setIsOpen(!isOpen)}>
        <h2 className="hndle" style={{ 
          margin: 0, 
          fontSize: '14px', 
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ flex: 1 }}>
            {isDevelopment ? (
              <span style={{ color: '#2271b1', cursor: 'default' }}>{post.title}</span>
            ) : (
              <a 
                href={`${wpLinkAuditor.adminUrl}post.php?post=${post.id}&action=edit`}
                title="Edit post in WordPress"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ textDecoration: 'none', color: '#2271b1' }}
              >
                {post.title}
              </a>
            )}
            <span style={{ 
              marginLeft: '12px', 
              fontSize: '13px', 
              fontWeight: 400, 
              color: '#646970' 
            }}>
              Published: {postDate}
              {lastModifiedDate && lastModifiedDate !== postDate && (
                <span style={{ marginLeft: '8px', color: '#8c8f94' }}>
                  • Modified: {lastModifiedDate}
                </span>
              )}
            </span>
          </span>
          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            marginLeft: '16px',
            fontSize: '13px',
            color: '#646970'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <InternalLinkIcon style={{ width: '16px', height: '16px' }} />
              {internalCount}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ExternalLinkIcon style={{ width: '16px', height: '16px' }} />
              {externalCount}
            </span>
            {brokenCount > 0 && (
              <span style={{ color: '#d63638', fontWeight: 600 }}>
                {brokenCount} broken
              </span>
            )}
            <ChevronDownIcon 
              style={{ 
                width: '20px', 
                height: '20px',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }} 
            />
          </span>
        </h2>
      </div>

      {isOpen && (
        <div className="inside" style={{ padding: '16px' }}>
          {/* Focus Keyphrase */}
          <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #c3c4c7' }}>
            <label 
              htmlFor={`keyphrase-${post.id}`}
              style={{ 
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1d2327'
              }}
            >
              Focus Keyphrase
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <KeyIcon style={{ width: '20px', height: '20px', color: '#646970' }} />
              <input
                id={`keyphrase-${post.id}`}
                type="text"
                value={keyphrase}
                onChange={(e) => setKeyphrase(e.target.value)}
                placeholder="e.g., WordPress SEO strategies"
                className="regular-text"
                style={{ flex: 1 }}
              />
              <button 
                onClick={handleKeyphraseSave} 
                disabled={!isKeyphraseDirty || isSaving}
                className="button button-primary"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Links Table */}
          {links.length > 0 ? (
            <LinkTable links={links} setLinks={setLinks} onLinkChange={handleLinkUpdate} />
          ) : (
            <p style={{ margin: 0, color: '#646970', textAlign: 'center', padding: '20px' }}>
              No links found in this post.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
