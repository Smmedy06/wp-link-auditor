
import React from 'react';
import { SpinnerIcon, XMarkIcon } from './Icons';

interface AIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  isLoading: boolean;
}

const MarkdownRenderer: React.FC<{ markdown: string }> = ({ markdown }) => {
    const html = markdown
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

export const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({ isOpen, onClose, content, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 01-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 013.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 013.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 01-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.25l-.648-1.688a2.25 2.25 0 01-1.471-1.471L12.75 18.5l1.688-.648a2.25 2.25 0 011.471-1.471L18.5 15.75l.648 1.688a2.25 2.25 0 011.471 1.471L22.25 19.5l-1.688.648a2.25 2.25 0 01-1.471 1.471z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">AI Link Analysis</h3>
                  <div className="mt-4">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-48">
                        <SpinnerIcon className="w-8 h-8 text-purple-600" />
                        <p className="ml-3 text-slate-600">Analyzing links with Gemini...</p>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none">
                        <MarkdownRenderer markdown={content} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                onClick={onClose}
              >
                Close
              </button>
            </div>
             <button
              onClick={onClose}
              className="absolute top-0 right-0 mt-4 mr-4 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
