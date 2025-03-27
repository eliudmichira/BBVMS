import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-8">
          Decentralized Voting System
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Link
            to="/voter"
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Voter Portal
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Cast your vote securely and verify your voting record on the blockchain.
            </p>
          </Link>
          <Link
            to="/admin"
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Admin Portal
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Manage candidates, monitor voting progress, and view election results.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home; 