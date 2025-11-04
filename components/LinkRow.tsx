
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
    <button
        type="button"
        className={`${checked ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
    >
        <span
            aria-hidden="true"
            className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
    </button>
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
    switch(link.status) {
      case LinkStatus.CHECKING:
        return <div className="flex items-center text-slate-500"><SpinnerIcon className="w-4 h-4 mr-2" /> Checking...</div>;
      case LinkStatus.OK:
        return <div className="flex items-center text-green-600"><CheckCircleIcon className="w-5 h-5 mr-1" /> OK</div>;
      case LinkStatus.BROKEN:
        return <div className="flex items-center text-red-600"><XCircleIcon className="w-5 h-5 mr-1" /> Broken</div>;
      case LinkStatus.IDLE:
        return (
          <button 
            onClick={handleCheckStatus}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Check Status
          </button>
        );
      default: return null;
    }
  };

  return (
    <tr className="hover:bg-slate-50">
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
        <div className="font-medium text-slate-900 bg-yellow-100 px-2 py-1 rounded inline-block">{link.anchorText}</div>
        <div className="text-slate-500 truncate mt-1 max-w-xs">{link.href}</div>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
        {link.isExternal ? (
             <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800"><ExternalLinkIcon className="h-3 w-3 mr-1"/> External</span>
        ) : (
             <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800"><InternalLinkIcon className="h-3 w-3 mr-1"/> Internal</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <ToggleSwitch checked={link.isNofollow} onChange={(val) => handleToggle('isNofollow', val)} />
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <ToggleSwitch checked={link.isNewTab} onChange={(val) => handleToggle('isNewTab', val)} />
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium">
        {link.isExternal ? getStatusIndicator() : <span className="text-slate-400">-</span>}
      </td>
    </tr>
  );
};
