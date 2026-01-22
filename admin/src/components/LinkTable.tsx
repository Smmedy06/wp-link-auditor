import React, { useCallback } from 'react';
import { Link, LinkStatus } from '../types';
import { LinkRow } from './LinkRow';
import { checkLinkStatus } from '../utils/linkUtils';

interface LinkTableProps {
  links: Link[];
  setLinks: React.Dispatch<React.SetStateAction<Link[]>>;
  onLinkChange: (originalLink: Link, updatedLink: Link) => void;
}

export const LinkTable: React.FC<LinkTableProps> = ({ links, setLinks, onLinkChange }) => {
  const externalLinks = links.filter(link => link.isExternal && link.status === LinkStatus.IDLE);

  const handleCheckAllLinks = useCallback(() => {
    links.forEach(link => {
      if (link.isExternal && link.status === LinkStatus.IDLE) {
        setLinks(prevLinks => prevLinks.map(l => l.id === link.id ? { ...l, status: LinkStatus.CHECKING } : l));
        checkLinkStatus(link).then(status => {
          setLinks(prevLinks => prevLinks.map(l => l.id === link.id ? { ...l, status } : l));
        });
      }
    });
  }, [links, setLinks]);

  return (
    <div style={{ overflowX: 'auto' }}>
      {externalLinks.length > 0 && (
        <div style={{ marginBottom: '16px', textAlign: 'right' }}>
          <button
            onClick={handleCheckAllLinks}
            className="button"
          >
            Check All External Links ({externalLinks.length})
          </button>
        </div>
      )}
      <table className="wp-list-table widefat fixed striped">
        <thead>
          <tr>
            <th scope="col" style={{ width: '30%' }}>Anchor Text & URL</th>
            <th scope="col" style={{ width: '10%' }}>Type</th>
            <th scope="col" style={{ width: '10%' }}>Nofollow</th>
            <th scope="col" style={{ width: '10%' }}>New Tab</th>
            <th scope="col" style={{ width: '15%' }}>Status</th>
            <th scope="col" style={{ width: '25%' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {links.length > 0 ? (
            links.map(link => (
              <LinkRow key={link.id} link={link} onLinkChange={onLinkChange} setLinks={setLinks} />
            ))
          ) : (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#646970' }}>
                No links found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
