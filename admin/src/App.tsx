import React from 'react';
import { Dashboard } from './components/Dashboard';
import './index.css';

const App: React.FC = () => {
  return (
    <div className="wp-link-auditor-app">
      <Dashboard />
    </div>
  );
};

export default App;
