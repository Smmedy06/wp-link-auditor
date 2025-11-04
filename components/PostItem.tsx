
import React, { useState, useMemo, useCallback } from 'react';
import { Post, Link } from '../types';
import { parseLinksFromHTML, updatePostContentWithLinkChanges } from '../utils/linkUtils';
import { LinkTable } from './LinkTable';
import { AIAnalysisModal } from './AIAnalysisModal';
import { ChevronDownIcon, ExternalLinkIcon, InternalLinkIcon, SparklesIcon, KeyIcon } from './Icons';
import { analyzeLinksWithAI } from '../services/geminiService';

interface PostItemProps {
  post: Post;
  onUpdatePost: (post: Post) => void;
}

export const PostItem: React.FC<PostItemProps> = ({ post, onUpdatePost }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [links, setLinks] = useState<Link[]>(() => parseLinksFromHTML(post.content));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [keyphrase, setKeyphrase] = useState(post.focusKeyphrase || '');

  const isKeyphraseDirty = keyphrase !== (post.focusKeyphrase || '');

  const { internalCount, externalCount } = useMemo(() => {
    return links.reduce(
      (counts, link) => {
        link.isExternal ? counts.externalCount++ : counts.internalCount++;
        return counts;
      },
      { internalCount: 0, externalCount: 0 }
    );
  }, [links]);
  
  const handleLinkUpdate = useCallback((originalLink: Link, updatedLink: Link) => {
    const newContent = updatePostContentWithLinkChanges(post.content, originalLink, updatedLink);
    const updatedPost = { ...post, content: newContent };
    onUpdatePost(updatedPost);
    setLinks(parseLinksFromHTML(newContent));
  }, [post, onUpdatePost]);

  const handleAnalyzeClick = async () => {
    setIsAnalyzing(true);
    setIsModalOpen(true);
    const result = await analyzeLinksWithAI(links, post.focusKeyphrase);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleKeyphraseSave = () => {
    if (isKeyphraseDirty) {
      onUpdatePost({ ...post, focusKeyphrase: keyphrase });
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
               <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="w-full text-left flex items-center justify-between group"
                  aria-expanded={isOpen}
               >
                 <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-slate-800 truncate group-hover:text-blue-600">{post.title}</p>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-slate-500">
                      <div className="flex items-center space-x-1">
                          <InternalLinkIcon className="h-4 w-4"/>
                          <span>{internalCount} Internal</span>
                      </div>
                      <div className="flex items-center space-x-1">
                          <ExternalLinkIcon className="h-4 w-4"/>
                          <span>{externalCount} External</span>
                      </div>
                    </div>
                 </div>
                 <ChevronDownIcon className={`h-6 w-6 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <div className="flex items-center ml-4 flex-shrink-0">
                <button
                  onClick={handleAnalyzeClick}
                  disabled={isAnalyzing}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-purple-300 transition-colors"
                >
                  <SparklesIcon className="h-4 w-4"/>
                  <span>{isAnalyzing ? 'Analyzing...' : 'AI Analysis'}</span>
                </button>
            </div>
          </div>
          
           <div className="mt-4 pt-4 border-t border-slate-200">
            <label htmlFor={`keyphrase-${post.id}`} className="block text-sm font-medium text-slate-700 mb-1">Focus Keyphrase</label>
            <div className="flex items-center space-x-2">
                 <div className="pointer-events-none text-slate-400">
                    <KeyIcon className="h-5 w-5" />
                 </div>
                <input
                    id={`keyphrase-${post.id}`}
                    type="text"
                    value={keyphrase}
                    onChange={(e) => setKeyphrase(e.target.value)}
                    placeholder="e.g., WordPress SEO strategies"
                    className="block w-full flex-1 rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <button 
                  onClick={handleKeyphraseSave} 
                  disabled={!isKeyphraseDirty}
                  className="px-4 py-1.5 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  Save
                </button>
            </div>
        </div>

        </div>
        {isOpen && (
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            {links.length > 0 ? (
               <LinkTable links={links} setLinks={setLinks} onLinkChange={handleLinkUpdate} />
            ) : (
                <p className="text-slate-500 text-center py-4">No links found in this post.</p>
            )}
          </div>
        )}
      </div>
      <AIAnalysisModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        content={aiAnalysis}
        isLoading={isAnalyzing}
      />
    </>
  );
};