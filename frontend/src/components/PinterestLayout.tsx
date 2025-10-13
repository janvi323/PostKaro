import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from './AuthWrapper'

export function Layout({ children }: { children: React.ReactNode }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }

  const handleAvatarClick = () => {
    navigate('/profile')
  }

  const navbarStyles = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-size: 1rem;
    }
    body {
      background: #f6f6f6;
    }
    * a {
      text-decoration: none;
      color: #151515;
    }
    .pinterest {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #fff;
      padding: 0.938rem;
      position: sticky;
      top: 0;
      z-index: 50;
      border-bottom: 1px solid #e5e5e5;
    }
    .left {
      display: flex;
      align-items: center;
      width: 20%;
    }
    .left .logo {
      border-radius: 50%;
      width: 3rem;
      height: 3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 0.5rem;
    }
    .left .logo:hover {
      background-color: #e5e5e5;
    }
    .left .logo i {
      color: #e60022;
      font-size: 24px;
    }
    .left .home {
      font-weight: bold;
      height: 3rem;
      color: #fff;
      padding: 1rem;
      background-color: #151515;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 1.563rem;
      text-decoration: none;
    }
    .left .home.active {
      background-color: #151515;
    }
    .avatar {
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .avatar .img {
      height: 2rem;
      width: 2rem;
      position: relative;
      border-radius: 50%;
      overflow: hidden;
    }
    .avatar .img img {
      position: absolute;
      object-fit: cover;
      width: 100%;
      height: 100%;
    }
    .search {
      width: 80%;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 3rem;
      border-radius: 25px;
      overflow: hidden;
      background: #e3e3e3;
    }
    .search:hover {
      background: #c9c9c9;
    }
    .search i {
      width: 3rem;
      height: 3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #767676;
    }
    .search input {
      width: 100%;
      border: none;
      background: none;
      outline: none;
      padding-right: 1rem;
    }
    .search input::placeholder {
      color: #767676;
      font-size: 1rem;
    }
    .right {
      width: 20%;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }
    .items {
      border-radius: 50%;
      width: 3rem;
      height: 3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 0.5rem;
    }
    .items:hover {
      background: #e5e5e5;
    }
    .items i {
      font-size: 1rem;
      color: #767676;
    }
    .items-down {
      border-radius: 50%;
      width: 1rem;
      height: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.7rem;
    }
    .items-down:hover {
      background: #e5e5e5;
    }
    
    /* User Dropdown Menu */
    .user-dropdown {
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 0.5rem;
      width: 16rem;
      background: white;
      border-radius: 1rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      border: 1px solid #e5e5e5;
      padding: 0.5rem 0;
      z-index: 50;
    }
    .user-dropdown-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #e5e5e5;
    }
    .user-dropdown-header p {
      font-size: 0.875rem;
      font-weight: 500;
      color: #151515;
      margin: 0;
    }
    .user-info {
      display: flex;
      align-items: center;
      margin-top: 0.5rem;
    }
    .user-info img {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      margin-right: 0.75rem;
    }
    .user-details h4 {
      font-size: 0.875rem;
      font-weight: 500;
      color: #151515;
      margin: 0;
    }
    .user-details p {
      font-size: 0.75rem;
      color: #767676;
      margin: 0;
    }
    .dropdown-item {
      width: 100%;
      text-align: left;
      padding: 0.5rem 1rem;
      color: #151515;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
    }
    .dropdown-item:hover {
      background: #f5f5f5;
    }
    .dropdown-divider {
      border-top: 1px solid #e5e5e5;
      margin: 0.25rem 0;
    }
  `

  return (
    <>
      <style>{navbarStyles}</style>
      <link 
        rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" 
        integrity="sha512-1ycn6IcaQQ40/MKBW2W4Rhis/DbILU74C1vSrLJxCq57o941Ym01SwNsOMqvEBFlcgUa6xLiPY/NS5R+E6ztJQ==" 
        crossOrigin="anonymous" 
        referrerPolicy="no-referrer" 
      />
      
      <div style={{ minHeight: '100vh', background: '#f6f6f6' }}>
        {/* Pinterest-style Header */}
        <div className="pinterest">
          <div className="left">
            <NavLink to="/feed" className="logo">
              <i className="fab fa-pinterest"></i>
            </NavLink>
            <NavLink to="/feed" className="home">
              Home
            </NavLink>
          </div>
          
          <div className="search">
            <i className="fas fa-search"></i>
            <input type="search" placeholder="Search for ideas" />
          </div>
          
          <div className="right" style={{ position: 'relative' }}>
            <a href="#" className="items">
              <i className="fas fa-bell"></i>
            </a>
            <NavLink to="/chats" className="items">
              <i className="far fa-comment-dots"></i>
            </NavLink>
            <div 
              className="avatar"
              onClick={handleAvatarClick}
            >
              <div className="img">
                <img 
                  src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'} 
                  alt="Profile" 
                />
              </div>
            </div>
            <a 
              href="#" 
              className="items-down"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <i className="fas fa-chevron-down"></i>
            </a>
            
            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <p>Currently in</p>
                  <div className="user-info">
                    <img
                      src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                      alt="Profile"
                    />
                    <div className="user-details">
                      <h4>{user?.username || 'User'}</h4>
                      <p>Personal</p>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '0.25rem 0' }}>
                  <button className="dropdown-item">Add account</button>
                  <button className="dropdown-item">Convert to business</button>
                  <NavLink to="/profile" className="dropdown-item">Settings</NavLink>
                  <button className="dropdown-item">Get help</button>
                  <button className="dropdown-item">See terms and privacy</button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item" onClick={handleLogout}>
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <main>
          {children}
        </main>
      </div>
    </>
  )
}