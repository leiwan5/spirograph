import { createRoot } from 'react-dom/client';
import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import './styles.css';
import { App } from './react/App';

const container = document.getElementById('app')!;
createRoot(container).render(<App />);
