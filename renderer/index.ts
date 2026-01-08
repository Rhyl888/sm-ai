import 'vfonts/Lato.css';
import './styles/index.css';

import { createPinia } from 'pinia';
import { createApp, type Plugin } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import App from '../renderer/App.vue';
import i18n from './i18n';
import errorHandler from './utils/errorHandler';

import DragRegion from './components/DragRegion.vue';
import TitleBar from './components/TitleBar.vue';

import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('vue', xml);

const components: Plugin = function (app) {
  app.component('TitleBar', TitleBar);
  app.component('DragRegion', DragRegion);
}

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
    },
  ],
})

const pinia = createPinia();

createApp(App)
  .use(pinia)
  .use(router)
  .use(components)
  .use(i18n)
  .use(errorHandler)
  .mount('#app');
