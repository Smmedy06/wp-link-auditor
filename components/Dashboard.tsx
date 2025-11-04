
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchPosts } from '../services/mockPostService';
import { Post, SortOrder } from '../types';
import { PostItem } from './PostItem';
import { SpinnerIcon, SearchIcon } from './Icons';

const POSTS_PER_PAGE = 50;

export const Dashboard: React.FC = () => {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.NEWEST);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      const posts = await fetchPosts();
      setAllPosts(posts);
      setLoading(false);
    };
    loadPosts();
  }, []);

  const handleUpdatePost = useCallback((updatedPost: Post) => {
    setAllPosts(prevPosts =>
      prevPosts.map(p => (p.id === updatedPost.id ? updatedPost : p))
    );
  }, []);

  const filteredAndSortedPosts = useMemo(() => {
    return allPosts
      .filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === SortOrder.NEWEST ? dateB - dateA : dateA - dateB;
      });
  }, [allPosts, searchTerm, sortOrder]);

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredAndSortedPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [filteredAndSortedPosts, currentPage]);
  
  const totalPages = Math.ceil(filteredAndSortedPosts.length / POSTS_PER_PAGE);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (order: SortOrder) => {
    setSortOrder(order);
    setCurrentPage(1);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <SpinnerIcon className="w-12 h-12 text-blue-600" />
        <p className="ml-4 text-lg text-slate-600">Loading Posts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search posts by title..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full rounded-md border-slate-300 pl-10 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex items-center justify-start md:justify-end space-x-2">
            <span className="text-sm font-medium text-slate-600">Sort by:</span>
            <button
              onClick={() => handleSortChange(SortOrder.NEWEST)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md ${
                sortOrder === SortOrder.NEWEST ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Newest
            </button>
            <button
              onClick={() => handleSortChange(SortOrder.OLDEST)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md ${
                sortOrder === SortOrder.OLDEST ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Oldest
            </button>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        {paginatedPosts.length > 0 ? (
          paginatedPosts.map(post => (
            <PostItem key={post.id} post={post} onUpdatePost={handleUpdatePost} />
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-slate-200">
             <p className="text-slate-500">No posts found matching your criteria.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-6">
           <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md disabled:opacity-50">Previous</button>
           <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
           <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
};
