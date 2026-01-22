import React, { useState, useMemo } from 'react';

interface AffectedLink {
  id: string;
  postTitle: string;
  anchorText: string;
  currentUrl: string;
  newUrl: string;
}

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplace: (findUrl: string, replaceUrl: string) => void;
  onReplaceSingle?: (linkId: string, findUrl: string, replaceUrl: string) => void;
  affectedCount: number;
  affectedLinks?: AffectedLink[];
  onFindUrlChange?: (url: string) => void;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({ 
  isOpen, 
  onClose, 
  onReplace,
  onReplaceSingle,
  affectedCount,
  affectedLinks = [],
  onFindUrlChange
}) => {
  const [findUrl, setFindUrl] = useState('');
  const [replaceUrl, setReplaceUrl] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [replacedLinks, setReplacedLinks] = useState<Set<string>>(new Set());

  const handleFindUrlChange = (value: string) => {
    setFindUrl(value);
    setShowPreview(false);
    setReplacedLinks(new Set());
    if (onFindUrlChange) {
      onFindUrlChange(value);
    }
  };

  const previewLinks = useMemo(() => {
    if (!findUrl.trim() || !affectedLinks) return [];
    return affectedLinks.map(link => ({
      ...link,
      newUrl: link.currentUrl.replace(findUrl, replaceUrl)
    }));
  }, [findUrl, replaceUrl, affectedLinks]);

  const handleReplaceSingle = async (linkId: string) => {
    if (!onReplaceSingle) return;
    setIsReplacing(true);
    try {
      await onReplaceSingle(linkId, findUrl, replaceUrl);
      setReplacedLinks(prev => new Set(prev).add(linkId));
    } catch (error) {
      alert('Failed to replace link. Please try again.');
    } finally {
      setIsReplacing(false);
    }
  };

  if (!isOpen) return null;

  const handleReplace = async () => {
    if (!findUrl.trim()) {
      alert('Please enter a URL to find.');
      return;
    }

    if (!confirm(`This will replace "${findUrl}" with "${replaceUrl || '(empty)'}" in ${affectedCount} link(s). Continue?`)) {
      return;
    }

    setIsReplacing(true);
    try {
      await onReplace(findUrl, replaceUrl);
      setFindUrl('');
      setReplaceUrl('');
      setShowPreview(false);
      setReplacedLinks(new Set());
      onClose();
    } catch (error) {
      alert('Failed to replace URLs. Please try again.');
    } finally {
      setIsReplacing(false);
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
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        className="postbox"
        style={{
          backgroundColor: '#fff',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: 'calc(100vh - 40px)',
          overflow: 'auto',
          position: 'relative',
          margin: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Find and Replace URL</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            Find URL:
          </label>
          <input
            type="text"
            value={findUrl}
            onChange={(e) => handleFindUrlChange(e.target.value)}
            placeholder="https://old-domain.com/page"
            className="regular-text"
            style={{ width: '100%' }}
            autoFocus
          />
          <p className="description" style={{ marginTop: '4px', fontSize: '13px', color: '#646970' }}>
            Enter the URL you want to find and replace
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            Replace with:
          </label>
          <input
            type="text"
            value={replaceUrl}
            onChange={(e) => setReplaceUrl(e.target.value)}
            placeholder="https://new-domain.com/page"
            className="regular-text"
            style={{ width: '100%' }}
          />
          <p className="description" style={{ marginTop: '4px', fontSize: '13px', color: '#646970' }}>
            Enter the new URL (leave empty to remove the link)
          </p>
        </div>

        {findUrl.trim() && (
          <div style={{ 
            marginBottom: '16px', 
            padding: '12px', 
            backgroundColor: affectedCount > 0 ? '#f0f6fc' : '#fff3cd',
            borderRadius: '4px',
            border: `1px solid ${affectedCount > 0 ? '#2271b1' : '#ffb900'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{affectedCount > 0 ? 'Preview:' : 'No matches found:'}</strong> {affectedCount} link(s) will be affected
              </div>
              {affectedCount > 0 && (
                <button
                  className="button button-small"
                  onClick={() => setShowPreview(!showPreview)}
                  style={{ marginLeft: '12px' }}
                >
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              )}
            </div>
          </div>
        )}

        {showPreview && previewLinks.length > 0 && (
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
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #c3c4c7' }}>Post</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #c3c4c7' }}>Anchor Text</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #c3c4c7' }}>Current URL</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #c3c4c7' }}>New URL</th>
                  <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #c3c4c7', width: '100px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {previewLinks.map((link) => {
                  const isReplaced = replacedLinks.has(link.id);
                  return (
                    <tr key={link.id} style={{ backgroundColor: isReplaced ? '#d1e7dd' : 'transparent' }}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #c3c4c7' }}>{link.postTitle}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #c3c4c7' }}>{link.anchorText || '(no text)'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #c3c4c7', fontSize: '11px', color: '#646970', wordBreak: 'break-all', maxWidth: '200px' }}>
                        {link.currentUrl}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #c3c4c7', fontSize: '11px', color: '#646970', wordBreak: 'break-all', maxWidth: '200px' }}>
                        {link.newUrl || '(will be removed)'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #c3c4c7', textAlign: 'center' }}>
                        {isReplaced ? (
                          <span style={{ color: '#00a32a', fontSize: '12px' }}>✓ Replaced</span>
                        ) : onReplaceSingle ? (
                          <button
                            className="button button-small"
                            onClick={() => handleReplaceSingle(link.id)}
                            disabled={isReplacing}
                          >
                            Replace
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            className="button"
            onClick={onClose}
            disabled={isReplacing}
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            onClick={handleReplace}
            disabled={!findUrl.trim() || isReplacing || affectedCount === 0}
          >
            {isReplacing ? 'Replacing...' : `Replace All (${affectedCount})`}
          </button>
        </div>
      </div>
    </div>
  );
};

