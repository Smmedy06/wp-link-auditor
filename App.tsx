
import React from 'react';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8">
        <Dashboard />
      </main>
    </div>
  );
};

export default App;
