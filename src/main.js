import Vue from 'vue'
import App from './App.vue'
import router from '@/router';

import MilkdownEditor from './components/vditor.vue';

Vue.config.productionTip = false

// 全域註冊組件
Vue.component('MilkdownEditor', MilkdownEditor);

new Vue({
    router,
    render: h => h(App),
}).$mount('#app');
