import React from 'react';
import { Routes, Route } from 'react-router-dom';
import UserSelection from './components/UserSelection';
import ChatInterface from './components/ChatInterface';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<UserSelection />} />
        <Route path="/chat/:userType" element={<ChatInterface />} />
      </Routes>
    </div>
  );
}

export default App;