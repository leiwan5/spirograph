import { mount } from 'svelte';
import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import './styles.css';
import App from './svelte/App.svelte';

const target = document.getElementById('app')!;
mount(App, { target });
