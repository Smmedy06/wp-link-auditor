
import React from 'react';

const WpIcon: React.FC = () => (
  <svg className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.93 6.93a.75.75 0 011.06 0L10 10.94l4.01-4.01a.75.75 0 111.06 1.06L11.06 12l4.01 4.01a.75.75 0 11-1.06 1.06L10 13.06l-4.01 4.01a.75.75 0 01-1.06-1.06L8.94 12 4.93 7.99a.75.75 0 010-1.06z" clipRule="evenodd" />
    <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zM4.929 4.929a.75.75 0 011.06 0l1.061 1.06a.75.75 0 01-1.06 1.061L4.93 6.05a.75.75 0 010-1.06zM13.939 13.939a.75.75 0 011.06 0l1.061 1.06a.75.75 0 01-1.06 1.061l-1.06-1.06a.75.75 0 010-1.061zM2.75 10a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 012.75 10zM15.25 10a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM6.05 15.071a.75.75 0 010-1.06l1.06-1.061a.75.75 0 011.061 1.06l-1.06 1.06a.75.75 0 01-1.061 0zM12.879 7.121a.75.75 0 010-1.06l1.06-1.061a.75.75 0 011.061 1.06l-1.06 1.06a.75.75 0 01-1.061 0z" />
  </svg>
);


export const Header: React.FC = () => {
  return (
    <header className="bg-slate-800 shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 p-1 rounded-full">
                <WpIcon />
            </div>
            <h1 className="text-xl font-bold text-white">WordPress Link Auditor Pro</h1>
          </div>
        </div>
      </div>
    </header>
  );
};
