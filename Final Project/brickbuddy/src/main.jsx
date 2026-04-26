import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// StrictMode deliberately omitted: @react-three/fiber v9 + React 19 drops its
// WebGL context on the StrictMode double-mount and doesn't recover, which
// leaves the 3D viewer blank. Production semantics are unaffected.
createRoot(document.getElementById('root')).render(<App />)
