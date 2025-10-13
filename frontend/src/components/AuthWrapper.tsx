import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'

interface User {
  username: string
  email: string
  avatar: string
}

interface AuthContextType {
  user: User | null
  login: (usernameOrEmail: string, password: string) => boolean
  logout: () => void
  updateAvatar: (avatarUrl: string) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('postkaro_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const login = (usernameOrEmail: string, password: string): boolean => {
    // Simple authentication - check for janviranout/janvi (support both username and email)
    const validCredentials = 
      (usernameOrEmail === 'janviranout' || usernameOrEmail === 'janvi@postkaro.com') && 
      password === 'janvi'
    
    if (validCredentials) {
      const userData: User = {
        username: 'janviranout',
        email: 'janvi@postkaro.com',
        avatar: 'http://localhost:4000/images/dp/3d215613-51b6-4cf1-a1d3-ff0789799fa1.png'
      }
      setUser(userData)
      localStorage.setItem('postkaro_user', JSON.stringify(userData))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('postkaro_user')
  }

  const updateAvatar = (avatarUrl: string) => {
    if (user) {
      const updatedUser = { ...user, avatar: avatarUrl }
      setUser(updatedUser)
      localStorage.setItem('postkaro_user', JSON.stringify(updatedUser))
    }
  }

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider value={{ user, login, logout, updateAvatar, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export const AuthWrapper = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return <>{children}</>
}

const LoginForm = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isLogin) {
      const success = login(usernameOrEmail, password)
      if (!success) {
        setError('Invalid credentials. Use username: janviranout or email: janvi@postkaro.com, password: janvi')
      }
    } else {
      // Sign-up validation
      if (!firstName || !lastName || !usernameOrEmail || !password || !confirmPassword) {
        setError('Please fill in all fields')
        return
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
      
      if (password.length < 6) {
        setError('Password must be at least 6 characters long')
        return
      }
      
      // For demo, allow any sign-up but redirect to login
      alert('Account created successfully! Please log in with your credentials.')
      setIsLogin(true)
      setFirstName('')
      setLastName('')
      setPassword('')
      setConfirmPassword('')
      setError('')
    }
  }

  const handleForgotPassword = () => {
    alert('Demo: Use username: janviranout or email: janvi@postkaro.com, password: janvi')
  }

  const handleFacebookLogin = () => {
    alert('Facebook login not available in demo')
  }

  const handleGoogleLogin = () => {
    alert('Google login not available in demo')
  }

  return (
    <div style={{ 
      backgroundColor: '#fffff0', // Bright ivory background
      fontFamily: 'Arial, Helvetica, sans-serif',
      margin: 0,
      padding: 0,
      boxSizing: 'border-box',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: '#fffff0', // Remove white background, use ivory
        width: '480px',
        height: '650px',
        position: 'relative',
        borderRadius: '10px',
        // Removed box shadow to eliminate white padding effect
      }}>
        <div style={{
          width: '56%',
          position: 'absolute',
          margin: 'auto',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          textAlign: 'center' as const
        }}>
          {/* Pinterest Logo */}
          <img 
            src="https://i.pinimg.com/originals/d3/d1/75/d3d175e560ae133f1ed5cd4ec173751a.png" 
            alt="pin logo" 
            style={{
              width: '70px',
              position: 'relative',
              top: '20px'
            }}
          />
          
          <p style={{
            fontSize: '32px',
            fontWeight: 700,
            marginTop: '40px',
            marginBottom: '10px',
            lineHeight: '46px'
          }}>
            {isLogin ? 'Log in to see more' : 'Sign up to get your ideas'}
          </p>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <input 
                  type="text" 
                  placeholder="First Name" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{
                    width: '48%',
                    height: '48px',
                    margin: '5px 1%',
                    padding: '15px',
                    fontSize: '15px',
                    color: 'gray',
                    border: '2px solid rgb(218, 214, 214)',
                    borderRadius: '15px',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.boxShadow = '0px -7px 3px -2px rgba(15, 91, 231, 0.4), 0px 7px 3px -2px rgba(15, 91, 231, 0.4), 7px 0px 3px -2px rgba(15, 91, 231, 0.4), -7px 0px 3px -2px rgba(15, 91, 231, 0.4)'
                    e.target.style.outline = 'none'
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = 'none'
                  }}
                  required={!isLogin}
                />
                <input 
                  type="text" 
                  placeholder="Last Name" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={{
                    width: '48%',
                    height: '48px',
                    margin: '5px 1%',
                    padding: '15px',
                    fontSize: '15px',
                    color: 'gray',
                    border: '2px solid rgb(218, 214, 214)',
                    borderRadius: '15px',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.boxShadow = '0px -7px 3px -2px rgba(15, 91, 231, 0.4), 0px 7px 3px -2px rgba(15, 91, 231, 0.4), 7px 0px 3px -2px rgba(15, 91, 231, 0.4), -7px 0px 3px -2px rgba(15, 91, 231, 0.4)'
                    e.target.style.outline = 'none'
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = 'none'
                  }}
                  required={!isLogin}
                />
                <br />
              </>
            )}
            
            <input 
              type="text" 
              placeholder={isLogin ? "Username or Email" : "Email"} 
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                margin: '5px',
                padding: '15px',
                fontSize: '15px',
                color: 'gray',
                border: '2px solid rgb(218, 214, 214)',
                borderRadius: '15px',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = '0px -7px 3px -2px rgba(15, 91, 231, 0.4), 0px 7px 3px -2px rgba(15, 91, 231, 0.4), 7px 0px 3px -2px rgba(15, 91, 231, 0.4), -7px 0px 3px -2px rgba(15, 91, 231, 0.4)'
                e.target.style.outline = 'none'
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none'
              }}
              required
            />
            <br />
            
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                margin: '5px',
                padding: '15px',
                fontSize: '15px',
                color: 'gray',
                border: '2px solid rgb(218, 214, 214)',
                borderRadius: '15px',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = '0px -7px 3px -2px rgba(15, 91, 231, 0.4), 0px 7px 3px -2px rgba(15, 91, 231, 0.4), 7px 0px 3px -2px rgba(15, 91, 231, 0.4), -7px 0px 3px -2px rgba(15, 91, 231, 0.4)'
                e.target.style.outline = 'none'
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none'
              }}
              required
            />
            
            {!isLogin && (
              <>
                <br />
                <input 
                  type="password" 
                  placeholder="Confirm Password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: '48px',
                    margin: '5px',
                    padding: '15px',
                    fontSize: '15px',
                    color: 'gray',
                    border: '2px solid rgb(218, 214, 214)',
                    borderRadius: '15px',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.boxShadow = '0px -7px 3px -2px rgba(15, 91, 231, 0.4), 0px 7px 3px -2px rgba(15, 91, 231, 0.4), 7px 0px 3px -2px rgba(15, 91, 231, 0.4), -7px 0px 3px -2px rgba(15, 91, 231, 0.4)'
                    e.target.style.outline = 'none'
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = 'none'
                  }}
                  required
                />
              </>
            )}

            <h4 
              style={{
                fontSize: '13px',
                fontWeight: 700,
                position: 'relative',
                left: '-60px',
                margin: '5px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
              onClick={handleForgotPassword}
            >
              Forgot your password?
            </h4>

            {error && (
              <div style={{
                backgroundColor: '#ffebee',
                color: '#c62828',
                padding: '10px',
                borderRadius: '5px',
                margin: '10px 0',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <button 
              type="submit"
              style={{
                width: '100%',
                height: '40px',
                border: 'hidden',
                borderRadius: '20px',
                fontSize: '16px',
                margin: '10px 0px',
                backgroundColor: '#f30d19',
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#df0812'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f30d19'
              }}
            >
              Log in
            </button>
          </form>

          <p style={{
            fontSize: '15px',
            fontWeight: 700,
            margin: '10px 0px'
          }}>
            OR
          </p>

          <button 
            onClick={handleFacebookLogin}
            style={{
              width: '100%',
              height: '40px',
              border: 'hidden',
              borderRadius: '20px',
              fontSize: '16px',
              margin: '5px 0px',
              backgroundColor: 'rgb(9, 128, 240)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(8, 110, 206)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(9, 128, 240)'
            }}
          >
            <i className="fab fa-facebook fa-lg" style={{ color: 'white', paddingRight: '10px' }}></i>
            Continue with Facebook
          </button>

          <button 
            onClick={handleGoogleLogin}
            style={{
              width: '100%',
              height: '40px',
              border: 'hidden',
              borderRadius: '20px',
              fontSize: '16px',
              margin: '5px 0px',
              backgroundColor: '#ccc',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              color: 'black'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#a0a0a0'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ccc'
            }}
          >
            <i className="fab fa-google" style={{ color: 'rgb(11, 241, 22)', paddingRight: '10px' }}></i>
            Continue with Google
          </button>

          {/* Login/Signup Toggle Button - Moved here from top */}
          <div 
            style={{
              fontSize: '16px',
              fontWeight: 700,
              textAlign: 'center' as const,
              width: '126px',
              padding: '11px 0px',
              backgroundColor: 'rgb(241, 236, 236)',
              borderRadius: '20px',
              cursor: 'pointer',
              margin: '20px auto 10px auto'
            }}
            onClick={() => setIsLogin(!isLogin)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(220, 220, 220)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(241, 236, 236)'
            }}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </div>

          <footer style={{ marginTop: '20px' }}>
            <p style={{
              fontSize: '12px',
              margin: '10px',
              opacity: 0.7
            }}>
              By continuing, you agree to Pinterest's{' '}
              <b>Terms of Service, Privacy policy.</b>
            </p>
            <hr style={{
              width: '50%',
              opacity: 0.4,
              marginLeft: '25%'
            }} />
            <p style={{
              fontSize: '12px',
              margin: '10px',
              opacity: 1
            }}>
              Not on Pinterest yet? Sign up
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}