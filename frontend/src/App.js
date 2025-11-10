import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthProvider from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Landing from './components/Landing';
import Login from './components/Login';
import Signup from './components/Signup';
import CalendarPage from './components/CalendarPage';
import useAuth from './hooks/useAuth';
import { Navigate } from 'react-router-dom';

function RequireAuth({ children }) {
  const { loggedIn } = useAuth();
  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="App min-h-screen flex flex-col">
          <Header />

          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/app"
                element={<RequireAuth><CalendarPage /></RequireAuth>}
              />
              {/* Additional routes can be added here */}
            </Routes>
          </main>

          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
