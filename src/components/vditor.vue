<template>
  <div class="vditor-wrapper">
    <div id="vditor"></div>
  </div>
</template>

<script>
import Vditor from 'vditor';
import 'vditor/dist/index.css';

export default {
  name: 'VditorEditor',
  props: {
    value: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      contentEditor: null
    };
  },
  mounted() {
    this.initVditor();
  },
  methods: {
    initVditor() {
      this.contentEditor = new Vditor('vditor', {
        height: 500,
        mode: 'wysiwyg', // 所見即所得模式 (最像 Notion)
        value: this.value,
        lang: 'zh_TW',
        placeholder: '按 / 鍵可喚起功能選單...',
        
        // --- 核心修復：解決 customWysiwygToolbar is not a function ---
        // 手動補上這個屬性為空函數，防止 Vditor 內部調用時崩潰
        customWysiwygToolbar: (type, element) => {
          console.log(`customWysiwygToolbar called with type: ${type}`);
          console.log('element:', element);
          // 這裡可以留空，或者未來用來擴充選取文字後的浮動選單
          return false; 
        },

        // --- 工具欄行為配置 ---
        toolbarConfig: {
          pin: true,   // 滾動時固定工具欄在頂部
          hide: false  // 不自動隱藏工具欄
        },

        // --- 功能配置 ---
        cache: {
          enable: false // 關閉快取，避免開發時內容卡住
        },

        // --- 數據同步 ---
        input: (val) => {
          this.$emit('input', val);
        },

        // 載入完成後的 Hook
        after: () => {
          console.log('Vditor 渲染成功');
        }
      });
    }
  },
  beforeDestroy() {
    // 銷毀實例，防止記憶體洩漏
    if (this.contentEditor) {
      this.contentEditor.destroy();
    }
  }
};
</script>

<style scoped>
.vditor-wrapper {
  text-align: left;
  width: 100%;
  padding: 12px;
}

/* 確保編輯器樣式符合專案風格 */
::v-deep .vditor {
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

/* 如果你的工具欄被導覽列遮住，可以調整 pin 的 top 值 */
::v-deep .vditor-toolbar--pin {
  top: 0; 
  z-index: 100;
}
</style>