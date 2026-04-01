/**
 * ErrorBoundary — Catches React render errors and shows a friendly recovery UI.
 * Designed for children: non-scary language, simple restart button.
 */
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[BrickBuddy] Error caught:', error, info.componentStack);
  }

  handleRestart = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', padding: 40,
          background: 'linear-gradient(135deg, #FFF5EE, #FFE8D6)',
          fontFamily: "'Nunito', sans-serif", textAlign: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 80 }}>🔧</div>
          <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 32, color: '#FF6B35' }}>
            Oops! Something went wrong
          </h1>
          <p style={{ fontSize: 18, color: '#666', maxWidth: 400, fontWeight: 600 }}>
            Don't worry — your robot is safe! Let's restart and try again.
          </p>
          <button
            onClick={this.handleRestart}
            style={{
              padding: '14px 40px', border: 'none', borderRadius: 50,
              background: 'linear-gradient(135deg, #FF6B35, #FF8F65)',
              color: 'white', fontSize: 18, fontWeight: 700,
              fontFamily: "'Fredoka', sans-serif", cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(255,107,53,0.3)',
            }}
          >
            Restart BrickBuddy
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
