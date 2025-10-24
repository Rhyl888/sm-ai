import './styles/index.css';
import 'vfonts/Lato.css';

import { createApp } from 'vue';
import i18n from './i18n';
import App from '../renderer/App.vue';
import errorHandler from './utils/errorHandler';

createApp(App)
  .use(await i18n)
  .use(errorHandler)
  .mount('#app');
