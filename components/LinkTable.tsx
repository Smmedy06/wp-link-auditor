
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
    <div className="overflow-x-auto">
        <div className="flex justify-end mb-4">
            <button
                onClick={handleCheckAllLinks}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
                Check All External Links
            </button>
        </div>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Anchor Text & URL</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Type</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Nofollow</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">New Tab</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {links.map(link => (
            <LinkRow key={link.id} link={link} onLinkChange={onLinkChange} setLinks={setLinks} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
