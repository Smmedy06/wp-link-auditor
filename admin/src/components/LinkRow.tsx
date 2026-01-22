import React from 'react';
import { Link, LinkStatus } from '../types';
import { checkLinkStatus } from '../utils/linkUtils';
import { SpinnerIcon, CheckCircleIcon, XCircleIcon, ExternalLinkIcon, InternalLinkIcon } from './Icons';

interface LinkRowProps {
  link: Link;
  onLinkChange: (originalLink: Link, updatedLink: Link) => void;
  setLinks: React.Dispatch<React.SetStateAction<Link[]>>;
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
  <label style={{ 
    position: 'relative',
    display: 'inline-block',
    width: '44px',
    height: '24px',
    cursor: 'pointer'
  }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
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
      cursor: 'pointer'
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

export const LinkRow: React.FC<LinkRowProps> = ({ link, onLinkChange, setLinks }) => {
  const handleToggle = (field: 'isNofollow' | 'isNewTab', value: boolean) => {
    const updatedLink = { ...link, [field]: value };
    onLinkChange(link, updatedLink);
  };

  const handleCheckStatus = async () => {
    if (!link.isExternal) return;
    setLinks(prev => prev.map(l => (l.id === link.id ? { ...l, status: LinkStatus.CHECKING } : l)));
    const status = await checkLinkStatus(link);
    setLinks(prev => prev.map(l => (l.id === link.id ? { ...l, status } : l)));
  };
  
  const getStatusIndicator = () => {
    // Internal links always show as OK/Internal
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

    switch(link.status) {
      case LinkStatus.CHECKING:
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#646970' }}>
            <SpinnerIcon style={{ width: '16px', height: '16px' }} />
            Checking...
          </span>
        );
      case LinkStatus.OK:
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00a32a' }}>
            <CheckCircleIcon style={{ width: '16px', height: '16px' }} />
            OK
          </span>
        );
      case LinkStatus.BROKEN:
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d63638' }}>
            <XCircleIcon style={{ width: '16px', height: '16px' }} />
            Broken
          </span>
        );
      case LinkStatus.IDLE:
        return (
          <button 
            onClick={handleCheckStatus}
            className="button button-small"
          >
            Check Status
          </button>
        );
      default: 
        return <span style={{ color: '#646970' }}>-</span>;
    }
  };

  return (
    <tr>
      <td>
        <div style={{ marginBottom: '4px' }}>
          <strong style={{ 
            backgroundColor: '#f0f6fc', 
            padding: '4px 8px', 
            borderRadius: '3px',
            fontSize: '13px',
            display: 'inline-block'
          }}>
            {link.anchorText || '(no text)'}
          </strong>
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: '#646970',
          wordBreak: 'break-all',
          maxWidth: '400px'
        }}>
          {link.href}
        </div>
      </td>
      <td>
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
      <td>
        <ToggleSwitch checked={link.isNofollow} onChange={(val) => handleToggle('isNofollow', val)} />
      </td>
      <td>
        <ToggleSwitch checked={link.isNewTab} onChange={(val) => handleToggle('isNewTab', val)} />
      </td>
      <td>
        {getStatusIndicator()}
      </td>
      <td>
        <a
          href={link.href}
          target={link.isNewTab ? "_blank" : "_self"}
          rel={link.isNofollow ? "nofollow" : ""}
          className="button button-small"
          style={{ marginRight: '4px' }}
        >
          Visit
        </a>
      </td>
    </tr>
  );
};
