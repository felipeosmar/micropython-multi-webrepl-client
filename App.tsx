import React from 'react';
import ReplManager from './components/ReplManager';

function App(): React.ReactNode {
  return (
    <main className="bg-gray-900 text-gray-100 min-h-screen font-sans">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400">
            MicroPython Multi-WebREPL Client
          </h1>
          <p className="text-gray-400 mt-2">
            Connect to multiple boards from one dashboard.
          </p>
        </header>
        <ReplManager />
      </div>
    </main>
  );
}

export default App;
