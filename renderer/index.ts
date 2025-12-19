import 'vfonts/Lato.css';
import './styles/index.css';

import { createApp, type Plugin } from 'vue';
import App from '../renderer/App.vue';
import errorHandler from './utils/errorHandler';

import { createMemoryHistory, createRouter } from 'vue-router';
import DragRegion from './components/DragRegion.vue';
import TitleBar from './components/TitleBar.vue';
import i18n from './i18n';

const components: Plugin = function (app) {
  app.component('TitleBar', TitleBar);
  app.component('DragRegion', DragRegion);
};

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./views/index.vue'),
      children: [
        {
          path: '/',
          redirect: 'conversation'
        },
        {
          name: 'conversation',
          path: 'conversation/:id?',
          component: () => import('./views/conversation.vue')
        }
      ]
    }
  ]
});

const pinia = createPinia();

createApp(App)
  .use(pinia)
  .use(router)
  .use(components)
  .use(i18n)
  .use(errorHandler)
  .mount('#app');
