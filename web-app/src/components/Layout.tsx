import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Layout = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="layout-header__content">
          <div className="brand-logo">
            <span className="brand-logo__icon">🎧</span>
            <span>
              Smart <span className="text-gradient">Curator</span>
            </span>
          </div>

          <nav className="nav-menu">
            <Link to="/" className="nav-link">
              Dashboard
            </Link>

            {user && (
              <div className="user-profile">
                <div className="user-profile__info">
                  <img src={user.photoURL || ''} alt="Profile" className="user-avatar" />
                  <span className="user-name">{user.displayName?.split(' ')[0]}</span>
                </div>

                <button onClick={signOut} className="btn-logout">
                  Logout
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="main-content animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
};
