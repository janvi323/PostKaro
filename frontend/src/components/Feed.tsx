import { useState, useEffect } from 'react';
import '../assets/stylesheets/pinterest-feed.css';

interface Pin {
  id: string;
  title: string;
  imageUrl: string;
  creator: string;
  fileType: string;
  voiceUrl?: string;
  likes: number;
  comments: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
}

const Feed = () => {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        console.log('🔄 Fetching posts from API...');
        const response = await fetch('http://localhost:4000/api/posts');
        
        console.log('📡 API Response status:', response.status);
        console.log('📡 API Response ok:', response.ok);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
        }
        
        const posts = await response.json();
        console.log('📦 Received posts:', posts.length, 'posts');
        console.log('📦 Posts data:', posts);
        
        setPins(posts);
        setError(null);
      } catch (err) {
        console.error('❌ Error fetching posts:', err);
        setError('Failed to load posts. Please try again.');
        setPins([]); // Clear any existing pins on error
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleSave = (pin: Pin) => {
    console.log('Saved pin:', pin.title);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f6f6f6'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #e60023',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#666', fontSize: '16px' }}>Loading posts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f6f6f6'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <p style={{ fontSize: '18px', marginBottom: '1rem' }}>😞 {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="save"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (pins.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f6f6f6'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <p style={{ fontSize: '18px', marginBottom: '1rem' }}>📌 No posts yet!</p>
          <p style={{ fontSize: '14px' }}>Be the first to share something amazing.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container">
        {[0, 1, 2, 3].map(columnIndex => (
          <div key={columnIndex} className="column">
            {pins.filter((_, index) => index % 4 === columnIndex).map((pin) => (
              <div key={pin.id} className="content-wrapper">
                <div className="image-wrapper">
                  <img src={pin.imageUrl} alt={pin.title} />
                  <div className="overlay">
                    <div>
                      <div className="user-info">
                        {pin.user.avatar && (
                          <img 
                            src={pin.user.avatar} 
                            alt={pin.user.username}
                            className="user-avatar"
                          />
                        )}
                        <p>{pin.user.username}</p>
                      </div>
                      <button className="save" onClick={() => handleSave(pin)}>
                        Save
                      </button>
                    </div>
                    <div>
                      <div className="stats">
                        <span>❤️ {pin.likes}</span>
                        <span>💬 {pin.comments}</span>
                        {pin.voiceUrl && <span>🎵</span>}
                      </div>
                      <div>
                        <button className="round-button">
                          <span>📤</span>
                        </button>
                        <button className="round-button">
                          <span>⋯</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <p>{pin.title}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
};

export default Feed;