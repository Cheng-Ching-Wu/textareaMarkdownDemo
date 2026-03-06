import Vue from 'vue'
import VueRouter from 'vue-router';

import vditor from '@/components/vditor.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'tiptap',
    component: () => import('../components/tiptap/tiptapView.vue')
  },
  {
    path: '/vditor',
    name: 'vditor',
    component: vditor
  },
  {
    path: '/editorjs',
    name: 'editorjs',
    component: () => import('../components/EditorjsView.vue')
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
});

export default router;