import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StickyNoteWindow } from './components/StickyNoteWindow';
import './index.css';

// Sticky note windows reuse the same bundle: the `?sticky=<taskId>` query
// switches the root to the widget instead of the full app shell.
const stickyTaskId = new URLSearchParams(window.location.search).get('sticky');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {stickyTaskId ? <StickyNoteWindow taskId={stickyTaskId} /> : <App />}
  </StrictMode>,
);
