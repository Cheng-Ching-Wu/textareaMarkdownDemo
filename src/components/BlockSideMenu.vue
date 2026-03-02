<template>
  <div 
    class="notion-side-menu" 
    :style="menuStyle"
    :class="{ 'is-active': isMenuOpen }"
  >
    <div class="drag-handle" @click.stop="toggleMenu">
      <svg width="12" height="18" viewBox="0 0 12 18"><path d="M4 2h2v2H4V2zm0 5h2v2H4V7zm0 5h2v2H4v-2zm4-10h2v2H8V2zm0 5h2v2H8V7zm0 5h2v2H8v-2z" fill="currentColor"/></svg>
    </div>

    <div v-if="isMenuOpen" class="convert-popover">
      <div class="menu-item" @click="changeType('paragraph')">文字</div>
      <div class="menu-item" @click="changeType('heading', { level: 1 })">標題 1</div>
      <div class="menu-item" @click="changeType('bulletList')">無序清單</div>
      <div class="menu-item" @click="changeType('taskList')">待辦清單</div>
      <div class="menu-item" @click="changeType('table')">插入表格</div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['editor'],
  data() {
    return {
      top: -100,
      isMenuOpen: false,
      activeNodePos: null,
    }
  },
  computed: {
    menuStyle() {
      return {
        transform: `translateY(${this.top}px)`,
        opacity: this.top > -100 ? 1 : 0,
        // 如果選單打開，強制開啟點擊，否則會被 pointer-events: none 攔截
        pointerEvents: this.isMenuOpen ? 'auto' : 'none'
      }
    }
  },
  mounted() {
    // 監聽選取更新
    this.editor.on('selectionUpdate', this.updatePosition);
    // 核心修復：監聽焦點進入事件
    this.editor.on('focus', this.updatePosition);
    
    // 如果編輯器在掛載時就已經有內容或焦點，手動執行一次
    if (this.editor.isFocused) {
      this.updatePosition();
    }

    document.addEventListener('click', this.closeMenu);
  },
  beforeDestroy() {
    this.editor.off('selectionUpdate', this.updatePosition);
    this.editor.off('focus', this.updatePosition);
    document.removeEventListener('click', this.closeMenu);
  },
  methods: {
    updatePosition() {
      if (this.isMenuOpen) return;
      
      const { view, state } = this.editor;
      const { selection } = state;
      const start = selection.$anchor.before(1);
      
      const docSize = state.doc.content.size;
      const targetPos = (start + 1 > docSize) ? start : start + 1;

      try {
        const coords = view.coordsAtPos(targetPos);
        const editorRect = view.dom.getBoundingClientRect();
        const lineHeight = coords.bottom - coords.top;
        this.top = (coords.top - editorRect.top) + (lineHeight / 2) - 12;
        this.activeNodePos = start;
      } catch (e) {
        this.top = -100;
      }
    },
    toggleMenu(e) {
      e.preventDefault();
      this.isMenuOpen = !this.isMenuOpen;
    },
    closeMenu() {
      this.isMenuOpen = false;
    },
    changeType(type, options = {}) {
      // 核心：必須先 focus 編輯器，指令才會生效
      const chain = this.editor.chain().focus();

      // 1. 先將游標精確定位到該區塊，而不是選中整個區塊
      // 這能解決 setNodeSelection 導致的清單轉換失效問題
      chain.setTextSelection(this.activeNodePos);

      if (type === 'bulletList') {
        // 轉換為無序清單
        chain.toggleBulletList().run();
      } else if (type === 'taskList') {
        // 轉換為待辦清單
        chain.toggleTaskList().run();
      }  else if (type === 'table') {
        // 插入表格
        chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      } else {
        // 標題或段落：先提升出清單結構，清空格式後設定節點
        chain
          .lift('listItem') 
          .clearNodes()
          .setNode(type === 'heading' ? 'heading' : type, options)
          .run();
      }

      this.isMenuOpen = false;
    }
  }
}
</script>
<style lang="scss" scoped>
.notion-side-menu {
  position: absolute;
  left: -35px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000; /* 提高層級 */
  transition: transform 0.1s ease-out, opacity 0.2s;
  
  // 這裡是關鍵：預設不阻擋下方編輯器點擊
  pointer-events: none; 

  .drag-handle {
    // 這裡要恢復點擊
    pointer-events: auto; 
    cursor: pointer;
    padding: 7px 5px 3px 5px;
    border-radius: 4px;
    
    &:hover {
      background: #f0f0f0;
    }
  }

  .convert-popover {
    // 選單本身一定要能點擊
    pointer-events: auto; 
    position: absolute;
    top: 25px;
    left: 0;
    z-index: 1001;
    background: white;
    width: 120px;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    text-align: left;

    .menu-item {
      padding: 8px 12px;
      cursor: pointer;
      font-size: 14px;

      &:hover {
        background: #f0f0f0;
      }
    }
  }
}
</style>