import React, { useState, useCallback, useMemo } from 'react';
import { Link, LinkStatus, Post } from '../types';
import { updatePostContentWithLinkChanges, checkLinkStatus, replaceUrlsInContent, replaceSingleUrlInContent, parseLinksFromHTML, clearAllLinkStatuses } from '../utils/linkUtils';
import { updatePost } from '../services/wordpressService';
import { SpinnerIcon, CheckCircleIcon, XCircleIcon, ExternalLinkIcon, InternalLinkIcon } from './Icons';
import { FindReplaceModal } from './FindReplaceModal';

// URL Display Component with truncation
const UrlDisplay: React.FC<{ url: string; isExpanded: boolean; onToggle: () => void }> = ({ url, isExpanded, onToggle }) => {
  const MAX_LENGTH = 50;
  const shouldTruncate = url.length > MAX_LENGTH;
  
  if (!shouldTruncate) {
    return (
      <div style={{ fontSize: '12px', color: '#646970', wordBreak: 'break-all' }}>
        {url}
      </div>
    );
  }

  return (
    <div style={{ fontSize: '12px', color: '#646970' }}>
      <div style={{ wordBreak: 'break-all', marginBottom: '4px' }}>
        {isExpanded ? url : `${url.substring(0, MAX_LENGTH)}...`}
      </div>
      <button
        onClick={onToggle}
        style={{
          background: 'none',
          border: 'none',
          color: '#2271b1',
          cursor: 'pointer',
          fontSize: '11px',
          padding: 0,
          textDecoration: 'underline'
        }}
      >
        {isExpanded ? 'Show less' : 'Show full URL'}
      </button>
    </div>
  );
};

interface LinksViewProps {
  links: Array<Link & { postId: number; postTitle: string }>;
  allPosts: Post[];
  onUpdatePost: (post: Post) => void;
}

export const LinksView: React.FC<LinksViewProps> = ({ links, allPosts, onUpdatePost }) => {
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ href?: string; anchorText?: string }>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findUrlPreview, setFindUrlPreview] = useState('');
  const [expandedUrls, setExpandedUrls] = useState<Set<string>>(new Set());
  const [checkProgress, setCheckProgress] = useState<{ current: number; total: number } | null>(null);

  const handleSelectLink = (linkId: string) => {
    setSelectedLinks(prev => {
      const next = new Set(prev);
      if (next.has(linkId)) {
        next.delete(linkId);
      } else {
        next.add(linkId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedLinks.size === links.length) {
      setSelectedLinks(new Set());
    } else {
      setSelectedLinks(new Set(links.map(l => l.id)));
    }
  };

  const handleBulkUpdate = useCallback(async (field: 'isNofollow' | 'isNewTab', value: boolean) => {
    if (selectedLinks.size === 0) return;

    const linksToUpdate = links.filter(l => selectedLinks.has(l.id));
    const postsToUpdate = new Map<number, { post: Post; updates: Array<{ original: Link; updated: Link }> }>();

    linksToUpdate.forEach(link => {
      const post = allPosts.find(p => p.id === link.postId);
      if (!post) return;

      if (!postsToUpdate.has(post.id)) {
        postsToUpdate.set(post.id, { post, updates: [] });
      }

      const updatedLink = { ...link, [field]: value };
      postsToUpdate.get(post.id)!.updates.push({ original: link, updated: updatedLink });
    });

    for (const [postId, { post, updates }] of postsToUpdate) {
      try {
        setIsSaving(`bulk-${postId}`);
        let content = post.content;
        updates.forEach(({ original, updated }) => {
          content = updatePostContentWithLinkChanges(content, original, updated);
        });
        const updatedPost = await updatePost(postId, content, post.focusKeyphrase);
        onUpdatePost(updatedPost);
      } catch (error) {
        console.error(`Error updating post ${postId}:`, error);
        alert(`Failed to update post: ${post.title}`);
      } finally {
        setIsSaving(null);
      }
    }

    setSelectedLinks(new Set());
  }, [selectedLinks, links, allPosts, onUpdatePost]);

  const handleLinkUpdate = useCallback(async (link: Link & { postId: number }, updates: Partial<Link>) => {
    const post = allPosts.find(p => p.id === link.postId);
    if (!post) return;

    try {
      setIsSaving(link.id);
      const updatedLink = { ...link, ...updates };
      const newContent = updatePostContentWithLinkChanges(post.content, link, updatedLink);
      const updatedPost = await updatePost(post.id, newContent, post.focusKeyphrase);
      onUpdatePost(updatedPost);
    } catch (error) {
      console.error('Error updating link:', error);
      alert('Failed to update link. Please try again.');
    } finally {
      setIsSaving(null);
    }
  }, [allPosts, onUpdatePost]);

  const handleCheckLink = useCallback(async (link: Link & { postId: number }) => {
    if (!link.isExternal) {
      return;
    }
    
    const post = allPosts.find(p => p.id === link.postId);
    if (!post) {
      return;
    }

    try {
      setIsSaving(`check-${link.id}`);
      
      // Set status to CHECKING first
      const checkingLink = { ...link, status: LinkStatus.CHECKING };
      let currentContent = updatePostContentWithLinkChanges(post.content, link, checkingLink);
      let currentPost = await updatePost(post.id, currentContent, post.focusKeyphrase);
      onUpdatePost(currentPost);
      
      // Check the link status
      const status = await checkLinkStatus(link);
      
      // Update with final status
      const finalStatus = status === 'ok' ? LinkStatus.OK : LinkStatus.BROKEN;
      const finalLink = { ...link, status: finalStatus };
      const finalContent = updatePostContentWithLinkChanges(currentPost.content, checkingLink, finalLink);
      const finalUpdatedPost = await updatePost(post.id, finalContent, post.focusKeyphrase);
      onUpdatePost(finalUpdatedPost);
    } catch (error) {
      // Set to broken if check fails
      const brokenLink = { ...link, status: LinkStatus.BROKEN };
      const errorContent = updatePostContentWithLinkChanges(post.content, link, brokenLink);
      const errorUpdatedPost = await updatePost(post.id, errorContent, post.focusKeyphrase);
      onUpdatePost(errorUpdatedPost);
    } finally {
      setIsSaving(null);
    }
  }, [allPosts, onUpdatePost]);

  const handleBulkCheck = useCallback(async () => {
    const externalLinks = links.filter(l => l.isExternal && selectedLinks.has(l.id));
    
    if (externalLinks.length === 0) return;
    
    // Group links by post to batch updates
    const linksByPost = new Map<number, Array<Link & { postId: number }>>();
    externalLinks.forEach(link => {
      if (!linksByPost.has(link.postId)) {
        linksByPost.set(link.postId, []);
      }
      linksByPost.get(link.postId)!.push(link);
    });

    // Process in batches to prevent freezing
    const BATCH_SIZE = 10; // Process 10 links at a time
    const DELAY_BETWEEN_BATCHES = 100; // 100ms delay between batches
    const DELAY_BETWEEN_POSTS = 200; // 200ms delay between posts

    const totalLinks = Array.from(new Map(externalLinks.map(l => [l.href + '::' + l.id, l])).values()).length;
    let checkedCount = 0;
    setCheckProgress({ current: 0, total: totalLinks });

    // Process each post's links
    for (const [postId, postLinks] of linksByPost) {
      const post = allPosts.find(p => p.id === postId);
      if (!post) continue;

      try {
        setIsSaving(`bulk-check-${postId}`);
        let currentContent = post.content;

        // First, set all to CHECKING
        for (const link of postLinks) {
          const checkingLink = { ...link, status: LinkStatus.CHECKING };
          currentContent = updatePostContentWithLinkChanges(currentContent, link, checkingLink);
        }
        
        // Save CHECKING status
        let currentPost = await updatePost(postId, currentContent, post.focusKeyphrase);
        onUpdatePost(currentPost);

        // Deduplicate links by href to avoid repeatedly checking identical URLs
        // But we'll apply the status to ALL links with the same URL
        const uniqueUrls = new Map<string, Link & { postId: number }>();
        postLinks.forEach(link => {
          if (!uniqueUrls.has(link.href)) {
            uniqueUrls.set(link.href, link);
          }
        });
        const dedupedLinks = Array.from(uniqueUrls.values());

        // Process links in batches
        const urlStatusMap = new Map<string, LinkStatus>();
        
        for (let i = 0; i < dedupedLinks.length; i += BATCH_SIZE) {
          const batch = dedupedLinks.slice(i, i + BATCH_SIZE);
          
          // Check links in this batch
          const batchPromises = batch.map(async (link) => {
          try {
            const status = await checkLinkStatus(link);
            const linkStatus = status === 'ok' ? LinkStatus.OK : LinkStatus.BROKEN;
            urlStatusMap.set(link.href, linkStatus);
            return { link, status: linkStatus };
          } catch (error) {
            const linkStatus = LinkStatus.BROKEN;
            urlStatusMap.set(link.href, linkStatus);
            return { link, status: linkStatus };
          }
        });

          const batchResults = await Promise.all(batchPromises);
          checkedCount += batchResults.length;
          setCheckProgress({ current: checkedCount, total: totalLinks });

          // Update ALL links with the same URL (including duplicates)
          let batchContent = currentPost.content;
          for (const postLink of postLinks) {
            const status = urlStatusMap.get(postLink.href);
            if (status !== undefined) {
              const checkingLink = { ...postLink, status: LinkStatus.CHECKING };
              const finalLink = { ...postLink, status };
              batchContent = updatePostContentWithLinkChanges(batchContent, checkingLink, finalLink);
            }
          }
          
          // Save batch update
          currentPost = await updatePost(postId, batchContent, post.focusKeyphrase);
          onUpdatePost(currentPost);

          // Add delay between batches to prevent overwhelming the server
          if (i + BATCH_SIZE < dedupedLinks.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
          }
        }

        // Final update to ensure all statuses are saved for all link instances
        let finalContent = currentPost.content;
        for (const postLink of postLinks) {
          const status = urlStatusMap.get(postLink.href);
          if (status !== undefined) {
            const checkingLink = { ...postLink, status: LinkStatus.CHECKING };
            const finalLink = { ...postLink, status };
            finalContent = updatePostContentWithLinkChanges(finalContent, checkingLink, finalLink);
          }
        }

        const finalPost = await updatePost(postId, finalContent, post.focusKeyphrase);
        onUpdatePost(finalPost);

        // Delay between posts
        if (Array.from(linksByPost.keys()).indexOf(postId) < linksByPost.size - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_POSTS));
        }
      } catch (error) {
        console.error(`Failed to check links in post ${postId}:`, error);
        alert(`Failed to check links in post: ${post.title}`);
      } finally {
        setIsSaving(null);
      }
    }

    setCheckProgress(null);
    setSelectedLinks(new Set());
  }, [links, selectedLinks, allPosts, onUpdatePost]);

  const handleFindReplace = useCallback(async (find: string, replace: string) => {
    const affectedLinks = links.filter(l => l.href.includes(find) || l.href === find);
    const postsToUpdate = new Map<number, Post>();

    affectedLinks.forEach(link => {
      const post = allPosts.find(p => p.id === link.postId);
      if (post && !postsToUpdate.has(post.id)) {
        postsToUpdate.set(post.id, post);
      }
    });

    for (const [postId, post] of postsToUpdate) {
      try {
        setIsSaving(`replace-${postId}`);
        const newContent = replaceUrlsInContent(post.content, find, replace);
        const updatedPost = await updatePost(postId, newContent, post.focusKeyphrase);
        onUpdatePost(updatedPost);
      } catch (error) {
        alert(`Failed to update post: ${post.title}`);
      } finally {
        setIsSaving(null);
      }
    }
  }, [links, allPosts, onUpdatePost]);

  const handleExport = useCallback(() => {
    const csvData = [
      ['Post Title', 'Post ID', 'Post URL', 'Focus Keyword', 'Post Last Edited', 'Anchor Text', 'Link URL', 'Type', 'Nofollow', 'New Tab', 'Status', 'Has Featured Image'].join(','),
      ...links.map(link => {
        const post = allPosts.find(p => p.id === link.postId);
        const postUrl = post?.url || '';
        const focusKeyword = post?.focusKeyphrase || '';
        const hasFeaturedImage = post?.hasFeaturedImage ? 'Yes' : 'No';
        const lastModified = post?.lastModified 
          ? new Date(post.lastModified).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
          : '';
        
        return [
          `"${link.postTitle.replace(/"/g, '""')}"`,
          link.postId,
          `"${postUrl.replace(/"/g, '""')}"`,
          `"${focusKeyword.replace(/"/g, '""')}"`,
          `"${lastModified.replace(/"/g, '""')}"`,
          `"${(link.anchorText || '').replace(/"/g, '""')}"`,
          `"${link.href.replace(/"/g, '""')}"`,
          link.isExternal ? 'External' : 'Internal',
          link.isNofollow ? 'Yes' : 'No',
          link.isNewTab ? 'Yes' : 'No',
          link.status === LinkStatus.OK ? 'OK' : link.status === LinkStatus.BROKEN ? 'Broken' : link.status === LinkStatus.CHECKING ? 'Checking' : 'Unknown',
          hasFeaturedImage
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `link-audit-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [links, allPosts]);

  const handleResetAllStatuses = useCallback(async () => {
    if (!confirm('This will clear all saved link statuses. Links will need to be re-checked. Continue?')) {
      return;
    }

    const postsToUpdate = new Map<number, Post>();
    
    // Find all posts that have links with saved statuses
    links.forEach(link => {
      const post = allPosts.find(p => p.id === link.postId);
      if (post && !postsToUpdate.has(post.id)) {
        postsToUpdate.set(post.id, post);
      }
    });

    for (const [postId, post] of postsToUpdate) {
      try {
        setIsSaving(`reset-${postId}`);
        const newContent = clearAllLinkStatuses(post.content);
        const updatedPost = await updatePost(postId, newContent, post.focusKeyphrase);
        onUpdatePost(updatedPost);
      } catch (error) {
        alert(`Failed to reset statuses in post: ${post.title}`);
      } finally {
        setIsSaving(null);
      }
    }

    alert('All link statuses have been reset. Please refresh the page to see the changes.');
  }, [links, allPosts, onUpdatePost]);

  const affectedLinks = useMemo(() => {
    if (!findUrlPreview.trim()) return [];
    return links
      .filter(l => l.href.includes(findUrlPreview) || l.href === findUrlPreview)
      .map(link => ({
        id: link.id,
        postTitle: link.postTitle,
        anchorText: link.anchorText || '',
        currentUrl: link.href,
        newUrl: '' // Will be calculated in modal
      }));
  }, [links, findUrlPreview]);

  const affectedCount = affectedLinks.length;

  const handleReplaceSingle = useCallback(async (linkId: string, findUrl: string, replaceUrl: string) => {
    const link = links.find(l => l.id === linkId);
    if (!link) return;

    const post = allPosts.find(p => p.id === link.postId);
    if (!post) return;

    try {
      setIsSaving(`replace-${linkId}`);
      const newContent = replaceSingleUrlInContent(post.content, linkId, findUrl, replaceUrl);
      const updatedPost = await updatePost(post.id, newContent, post.focusKeyphrase);
      onUpdatePost(updatedPost);
    } catch (error) {
      throw error;
    } finally {
      setIsSaving(null);
    }
  }, [links, allPosts, onUpdatePost]);

  const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <label style={{ 
      position: 'relative',
      display: 'inline-block',
      width: '44px',
      height: '24px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        style={{ opacity: 0, width: 0, height: 0 }}
      />
      <span style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: checked ? '#2271b1' : '#c3c4c7',
        borderRadius: '24px',
        transition: 'background-color 0.2s',
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}>
        <span style={{
          position: 'absolute',
          height: '18px',
          width: '18px',
          left: checked ? '22px' : '3px',
          bottom: '3px',
          backgroundColor: '#fff',
          borderRadius: '50%',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }} />
      </span>
    </label>
  );

  const getStatusBadge = (link: Link) => {
    // Internal links always show as OK
    if (!link.isExternal) {
      return (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '4px', 
          color: '#00a32a', 
          fontSize: '12px',
          padding: '4px 8px',
          backgroundColor: '#d1e7dd',
          borderRadius: '4px',
          fontWeight: 500
        }}>
          <CheckCircleIcon style={{ width: '14px', height: '14px' }} />
          Internal
        </span>
      );
    }
    
    switch (link.status) {
      case LinkStatus.CHECKING:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#646970', fontSize: '12px' }}>
            <SpinnerIcon style={{ width: '14px', height: '14px' }} />
            Checking...
          </span>
        );
      case LinkStatus.OK:
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '4px', 
            color: '#00a32a', 
            fontSize: '12px',
            padding: '4px 8px',
            backgroundColor: '#d1e7dd',
            borderRadius: '4px',
            fontWeight: 500
          }}>
            <CheckCircleIcon style={{ width: '14px', height: '14px' }} />
            OK
          </span>
        );
      case LinkStatus.BROKEN:
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '4px', 
            color: '#d63638', 
            fontSize: '12px', 
            fontWeight: 600,
            padding: '4px 8px',
            backgroundColor: '#f8d7da',
            borderRadius: '4px'
          }}>
            <XCircleIcon style={{ width: '14px', height: '14px' }} />
            Broken
          </span>
        );
      default:
        return (
          <button 
            onClick={() => handleCheckLink(link)}
            className="button button-small"
            disabled={isSaving === `check-${link.id}`}
          >
            {isSaving === `check-${link.id}` ? 'Checking...' : 'Check'}
          </button>
        );
    }
  };

  return (
    <div>
      {/* Quick Actions Bar */}
      <div className="postbox" style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#f6f7f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="button button-primary"
            onClick={() => setShowFindReplace(true)}
          >
            Find & Replace URL
          </button>
          <button
            className="button"
            onClick={handleExport}
          >
            Export to CSV
          </button>
          <button
            className="button"
            onClick={handleBulkCheck}
            disabled={selectedLinks.size === 0 || !!isSaving}
            title="Check all selected external links"
          >
            {checkProgress ? `Checking... ${checkProgress.current}/${checkProgress.total}` : 'Check Selected Links'}
          </button>
          <button
            className="button"
            onClick={handleResetAllStatuses}
            disabled={!!isSaving}
            title="Clear all saved link statuses so links can be re-checked"
          >
            Reset All Statuses
          </button>
          <span style={{ marginLeft: 'auto', color: '#646970', fontSize: '13px' }}>
            {links.length} {links.length === 1 ? 'link' : 'links'} total
          </span>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedLinks.size > 0 && (
        <div className="postbox" style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#f0f6fc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <strong style={{ color: '#1d2327' }}>
              {selectedLinks.size} {selectedLinks.size === 1 ? 'link' : 'links'} selected
            </strong>
            <button
              className="button"
              onClick={() => handleBulkUpdate('isNofollow', true)}
              disabled={!!isSaving}
            >
              Add Nofollow
            </button>
            <button
              className="button"
              onClick={() => handleBulkUpdate('isNofollow', false)}
              disabled={!!isSaving}
            >
              Remove Nofollow
            </button>
            <button
              className="button"
              onClick={() => handleBulkUpdate('isNewTab', true)}
              disabled={!!isSaving}
            >
              Open in New Tab
            </button>
            <button
              className="button"
              onClick={() => handleBulkUpdate('isNewTab', false)}
              disabled={!!isSaving}
            >
              Same Tab
            </button>
            <button
              className="button"
              onClick={handleBulkCheck}
              disabled={!!isSaving}
            >
              {checkProgress ? `Checking... ${checkProgress.current}/${checkProgress.total}` : 'Check Status'}
            </button>
            <button
              className="button"
              onClick={() => setSelectedLinks(new Set())}
            >
              Clear Selection
            </button>
          </div>
          {checkProgress && (
            <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #c3c4c7', maxWidth: '360px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#1d2327', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                    Checking: {checkProgress.current}/{checkProgress.total}
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#c3c4c7', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${(checkProgress.current / checkProgress.total) * 100}%`, 
                        height: '100%', 
                        backgroundColor: '#2271b1',
                        transition: 'width 0.2s ease'
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Links Table - FRESH START */}
      <div className="wp-link-auditor-table-container">
        <table className="wp-link-auditor-table">
          <thead>
            <tr>
              <th className="col-checkbox">
                <input
                  type="checkbox"
                  checked={selectedLinks.size === links.length && links.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="col-post">Post</th>
              <th className="col-anchor">Anchor Text</th>
              <th className="col-url">URL</th>
              <th className="col-type">Type</th>
              <th className="col-nofollow">Nofollow</th>
              <th className="col-newtab">New Tab</th>
              <th className="col-status">Status</th>
              <th className="col-modified">Post Last Edited</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.length > 0 ? (
              links.map((link) => {
                const isEditing = editingLink === link.id;
                const isLinkSaving = isSaving === link.id || isSaving?.startsWith(`check-${link.id}`);

                return (
                  <tr key={link.id} style={{ backgroundColor: selectedLinks.has(link.id) ? '#f0f6fc' : undefined }}>
                    <td className="col-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedLinks.has(link.id)}
                        onChange={() => handleSelectLink(link.id)}
                      />
                    </td>
                    <td className="col-post">
                      <a
                        href={typeof (window as any).wpLinkAuditor !== 'undefined' && (window as any).wpLinkAuditor?.adminUrl 
                          ? `${(window as any).wpLinkAuditor.adminUrl}post.php?post=${link.postId}&action=edit`
                          : '#'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none', color: '#2271b1', fontSize: '13px' }}
                      >
                        {link.postTitle}
                      </a>
                    </td>
                    <td className="col-anchor">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues.anchorText ?? link.anchorText}
                          onChange={(e) => setEditValues({ ...editValues, anchorText: e.target.value })}
                          className="regular-text"
                          style={{ width: '100%', fontSize: '13px', boxSizing: 'border-box' }}
                          onBlur={() => {
                            if (editValues.anchorText && editValues.anchorText !== link.anchorText) {
                              // Update anchor text would require more complex HTML manipulation
                              // For now, just close edit mode
                            }
                            setEditingLink(null);
                            setEditValues({});
                          }}
                          autoFocus
                        />
                      ) : (
                        <span style={{ fontSize: '13px' }}>{link.anchorText || '(no text)'}</span>
                      )}
                    </td>
                    <td className="col-url">
                      <UrlDisplay 
                        url={link.href} 
                        isExpanded={expandedUrls.has(link.id)}
                        onToggle={() => {
                          setExpandedUrls(prev => {
                            const next = new Set(prev);
                            if (next.has(link.id)) {
                              next.delete(link.id);
                            } else {
                              next.add(link.id);
                            }
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="col-type">
                      {link.isExternal ? (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          padding: '2px 8px',
                          backgroundColor: '#f0f6fc',
                          borderRadius: '3px',
                          fontSize: '12px',
                          color: '#2271b1'
                        }}>
                          <ExternalLinkIcon style={{ width: '14px', height: '14px' }} />
                          External
                        </span>
                      ) : (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          padding: '2px 8px',
                          backgroundColor: '#f0f6fc',
                          borderRadius: '3px',
                          fontSize: '12px',
                          color: '#646970'
                        }}>
                          <InternalLinkIcon style={{ width: '14px', height: '14px' }} />
                          Internal
                        </span>
                      )}
                    </td>
                    <td className="col-nofollow">
                      <ToggleSwitch
                        checked={link.isNofollow}
                        onChange={(val) => handleLinkUpdate(link, { isNofollow: val })}
                        disabled={isLinkSaving}
                      />
                    </td>
                    <td className="col-newtab">
                      <ToggleSwitch
                        checked={link.isNewTab}
                        onChange={(val) => handleLinkUpdate(link, { isNewTab: val })}
                        disabled={isLinkSaving}
                      />
                    </td>
                    <td className="col-status">
                      {getStatusBadge(link)}
                    </td>
                    <td className="col-modified">
                      {(() => {
                        const post = allPosts.find(p => p.id === link.postId);
                        if (!post?.lastModified) return <span style={{ color: '#646970', fontSize: '12px' }}>-</span>;
                        const modifiedDate = new Date(post.lastModified);
                        const now = new Date();
                        const diffDays = Math.floor((now.getTime() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24));
                        
                        let displayDate: string;
                        if (diffDays === 0) {
                          displayDate = 'Today';
                        } else if (diffDays === 1) {
                          displayDate = 'Yesterday';
                        } else if (diffDays < 7) {
                          displayDate = `${diffDays} days ago`;
                        } else {
                          displayDate = modifiedDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          });
                        }
                        
                        return (
                          <div style={{ fontSize: '12px', color: '#646970' }} title={`Post last edited: ${modifiedDate.toLocaleString()}`}>
                            <div>{displayDate}</div>
                            <div style={{ fontSize: '11px', color: '#8c8f94', marginTop: '2px' }}>
                              {modifiedDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="col-actions">
                      <a
                        href={link.href}
                        target="_blank"
                        rel={`${link.isNofollow ? "nofollow" : ""} noopener noreferrer`}
                        className="button button-small"
                        title="Visit link (opens in new window)"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Visit
                      </a>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#646970' }}>
                  No links found. Try adjusting your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Find & Replace Modal */}
      <FindReplaceModal
        isOpen={showFindReplace}
        onClose={() => {
          setShowFindReplace(false);
          setFindUrlPreview('');
        }}
        onReplace={(find, replace) => {
          handleFindReplace(find, replace);
          setFindUrlPreview('');
        }}
        onReplaceSingle={handleReplaceSingle}
        affectedCount={affectedCount}
        affectedLinks={affectedLinks}
        onFindUrlChange={setFindUrlPreview}
      />
    </div>
  );
};
