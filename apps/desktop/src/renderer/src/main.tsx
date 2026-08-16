import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from './lib/router';
import { App } from './App';
import { WorkspaceProvider } from './state/WorkspaceContext';
import './styles/global.css';
import './styles/authority.css';
import './styles/hackathon-studio.css';
import './styles/hackathon-entry.css';
import './styles/hackathon-entry-evidence.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>
    </HashRouter>
  </React.StrictMode>,
);
