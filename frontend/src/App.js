import './App.css';
import 'react-calendar/dist/Calendar.css';
import { Routes, Route } from 'react-router-dom';
import Landing from './components/Landing';
//import Login from './components/Login';
import Header from './components/Header';
import Footer from './components/Footer';
import Calendar from 'react-calendar';
import React from 'react';

function CalendarView(){
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center p-8">
        <Calendar />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<CalendarView />} />
    </Routes>
  );
}

export default App;
