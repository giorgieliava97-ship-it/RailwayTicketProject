import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.svg';
import AuthModal from './AuthModal';
import './Navbar.css';

export default function Navbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [userName, setUserName] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();

  // 🟢 ვამოწმებთ არის თუ არა იუზერი დალოგინებული
  useEffect(() => {
    const name = localStorage.getItem('userName');
    if (name) {
      setUserName(name);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    setUserName('');
    navigate('/');
    window.location.reload();
  };

  const handleSelect = (path) => {
    setIsDropdownOpen(false);
    navigate(path);
  };

  return (
    <div className="navbar-wrapper">
      <header className="navbar-container">
        
        <Link to="/" className="navbar-logo">
          <img src={logo} alt="საქართველოს რკინიგზა" />
        </Link>

        <nav className="navbar-menu">
          
          {/* 🟢 თუ დალოგინებულია - ვჩვენებთ სახელს და გამოსვლის ღილაკს, თუ არა - შესვლას */}
          {userName ? (
            <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
              {/* მომხმარებლის სახელი - გადადის /profile-ზე */}
              <div 
                className="nav-item" 
                onClick={() => navigate('/profile')} 
                style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'}}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {userName}
              </div>

              {/* გამოსვლის (Logout) წითელი ღილაკი */}
              <button 
                type="button" 
                onClick={handleLogout} 
                style={{background: 'none', border: 'none', cursor: 'pointer', color: '#e53935', display: 'flex', alignItems: 'center'}}
                title="გამოსვლა"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          ) : (
            <button 
              type="button" 
              className="nav-item" 
              onClick={() => setIsAuthOpen(true)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              შესვლა
            </button>
          )}

          <Link 
            to="/schedule" 
            className={`nav-item ${location.pathname === '/schedule' ? 'active' : ''}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <rect x="7" y="14" width="2" height="2" fill="currentColor"></rect>
              <rect x="11" y="14" width="2" height="2" fill="currentColor"></rect>
              <rect x="15" y="14" width="2" height="2" fill="currentColor"></rect>
            </svg>
            განრიგი
          </Link>

          <div
            className="dropdown-wrapper"
            onMouseEnter={() => setIsDropdownOpen(true)}
            onMouseLeave={() => setIsDropdownOpen(false)}
          >
            <div className="nav-item">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="8" y1="13" x2="16" y2="13" stroke="#ff3b30" strokeWidth="2.5"></line>
                <line x1="8" y1="17" x2="16" y2="17" stroke="#ff3b30" strokeWidth="2.5"></line>
              </svg>
              დამატებითი ინფორმაცია ▾
            </div>

            {isDropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-item" onClick={() => handleSelect('/info/4')}><span>📋</span> ჯგუფური განაცხადები</div>
                <div className="dropdown-item" onClick={() => handleSelect('/info/5')}><span>⭐</span> უპირატესობები</div>
                <div className="dropdown-item" onClick={() => handleSelect('/info/6')}><span>🚆</span> გამგზავრებამდე</div>
                <div className="dropdown-item" onClick={() => handleSelect('/info/7')}><span>💺</span> მგზავრობის დროს</div>
                <div className="dropdown-item" onClick={() => handleSelect('/info/8')}><span>📄</span> ინსტრუქცია</div>
                <div className="dropdown-item" onClick={() => handleSelect('/info/9')}><span>📜</span> წესები და პირობები</div>
                <div className="dropdown-item" onClick={() => handleSelect('/info/10')}><span>💼</span> კომპენსაციის პირობები</div>
                <div className="dropdown-item" onClick={() => handleSelect('/info/11')}><span>🔒</span> კონფიდენციალურობის პოლიტიკა</div>
                <div className="dropdown-item" onClick={() => handleSelect('/info/12')}><span>❓</span> ხშირად დასმული კითხვები</div>
                <div className="dropdown-item" onClick={() => handleSelect('/info/13')}><span>📞</span> დახმარება / კონტაქტი</div>
              </div>
            )}
          </div>

          <div className="lang-badge">
            🇬🇪 KA ▾
          </div>
        </nav>

      </header>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}