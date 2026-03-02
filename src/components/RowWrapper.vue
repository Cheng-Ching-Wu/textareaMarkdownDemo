<template>
  <node-view-wrapper class="notion-row-container" :class="{ 'is-focused': isFocused, 'is-inside-list': isInsideList }">
    <div class="side-controls" contenteditable="false">
      <!-- 加入 @click 事件 -->
      <div class="drag-handle" draggable="true" @dragstart="onDragStart" @dragend="onDragEnd" @click="toggleMenu" @mousedown="onMouseDown">
        <svg width="12" height="18" viewBox="0 0 12 18">
          <path d="M4 2h2v2H4V2zm0 5h2v2H4V7zm0 5h2v2H4v-2zm4-10h2v2H8V2zm0 5h2v2H8V7zm0 5h2v2H8v-2z" fill="rgba(55, 53, 47, 0.4)"/>
        </svg>
      </div>

      <!-- 區塊功能選單 (Block Menu) -->
      <div v-if="showMenu" class="block-menu-overlay" @click="closeMenu"></div>
      <div v-if="showMenu" class="block-menu">
        <div class="menu-item delete-item" @click="deleteNode">
          <span class="icon">🗑️</span> 刪除
        </div>
        <div class="menu-divider"></div>
        <div class="menu-label">轉換為...</div>
        <div class="menu-item" @click="turnInto('paragraph')">
          <span class="icon">T</span> 一般文字
        </div>
        <div class="menu-item" @click="turnInto('heading', { level: 1 })">
          <span class="icon">H1</span> 標題 1
        </div>
        <div class="menu-item" @click="turnInto('heading', { level: 2 })">
          <span class="icon">H2</span> 標題 2
        </div>
        <div class="menu-item" @click="turnInto('heading', { level: 3 })">
          <span class="icon">H3</span> 標題 3
        </div>
        <div class="menu-item" @click="turnIntoList('bulletList')">
          <span class="icon">●</span> 項目符號
        </div>
        <div class="menu-item" @click="turnIntoList('orderedList')">
          <span class="icon">1.</span> 編號清單
        </div>
        <div class="menu-item" @click="insertTable">
          <span class="icon">▦</span> 插入表格
        </div>
      </div>
    </div>
    
    <!-- 針對 Table 的特殊渲染結構：必須包含 table/tbody 標籤 -->
    <div v-if="isTable" class="content-runtime" style="overflow-x: auto">
      <table style="min-width: 100%">
        <node-view-content as="tbody" />
      </table>
    </div>
    <!-- 一般節點 (Paragraph, Heading) -->
    <node-view-content v-else class="content-runtime" :as="contentTag" />
  </node-view-wrapper>
</template>

<script>
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-2'

export default {
  components: { NodeViewWrapper, NodeViewContent },
  props: nodeViewProps,
  data() {
    return {
      isFocused: false,
      showMenu: false, // 控制選單顯示
      isInsideList: false,
    }
  },
  computed: {
    isTable() {
      return this.node.type.name === 'table'
    },
    // 動態決定渲染的標籤 (p, h1, h2, h3...)
    contentTag() {
      if (this.node.type.name === 'heading') {
        return `h${this.node.attrs.level}`
      }
      return 'p'
    }
  },
  mounted() {
    // 監聽選取範圍變更，判斷是否聚焦在當前區塊
    this.editor.on('selectionUpdate', this.checkFocus)
    this.editor.on('focus', this.checkFocus)
    this.editor.on('blur', this.checkFocus)
    // 監聽 transaction 以確保結構變更 (如 Tab 縮排) 時能即時更新狀態
    this.editor.on('transaction', this.checkListStatus)
    this.checkFocus() // 初始化時先檢查一次
    this.checkListStatus()
  },
  beforeDestroy() {
    this.editor.off('selectionUpdate', this.checkFocus)
    this.editor.off('focus', this.checkFocus)
    this.editor.off('blur', this.checkFocus)
    this.editor.off('transaction', this.checkListStatus)
  },
  methods: {
    checkFocus() {
      // 如果編輯器本身沒有聚焦，則不顯示拖曳點 (模仿 Notion 行為)
      if (!this.editor.isFocused) {
        this.isFocused = false
        return
      }

      const { selection } = this.editor.state
      const pos = this.getPos()
      // 簡單判斷：游標選取範圍是否完全落在當前節點內
      if (typeof pos === 'number') {
        this.isFocused = selection.from >= pos && selection.to <= (pos + this.node.nodeSize)
      }
    },
    checkListStatus() {
      const pos = this.getPos()
      if (typeof pos !== 'number') return
      const $pos = this.editor.state.doc.resolve(pos)
      this.isInsideList = $pos.parent.type.name === 'listItem'
    },
    toggleMenu() {
      this.showMenu = !this.showMenu
    },
    closeMenu() {
      this.showMenu = false
    },
    deleteNode() {
      const pos = this.getPos()
      // 刪除時選中整個節點是正確的
      this.editor.chain().setNodeSelection(pos).deleteSelection().run()
      this.closeMenu()
    },
    turnInto(type, attrs = {}) {
      const pos = this.getPos()
      
      // 1. 關鍵修正：先同步將游標移入該區塊內部 (pos + 1)
      // 這樣編輯器的狀態 (State) 會立即更新，讓後續的 isActive 判斷正確
      this.editor.commands.setTextSelection(pos + 1)
      
      // 2. 現在判斷會基於正確的游標位置
      if (type === 'paragraph' && this.editor.isActive('listItem')) {
        this.editor.commands.liftListItem('listItem')
      } else {
        this.editor.commands.setNode(type, attrs)
      }
      
      this.closeMenu()
    },
    turnIntoList(type) {
      const pos = this.getPos()
      // 同樣改為同步執行，確保穩定性
      this.editor.commands.setTextSelection(pos + 1)
      this.editor.commands.toggleList(type, 'listItem')
      this.closeMenu()
    },
    insertTable() {
      const pos = this.getPos()
      // 確保在當前區塊內插入
      this.editor.commands.setTextSelection(pos + 1)
      this.editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      this.closeMenu()
    },
    onMouseDown(event) {
      // 關鍵：阻止事件冒泡，避免 ProseMirror 接收到 mousedown 後將選取範圍重置為表格內部的 CellSelection
      event.stopPropagation()
      
      // 檢查是否在 List 內，如果是，則選中整個 ListItem
      const { state } = this.editor
      const pos = this.getPos()
      const $pos = state.doc.resolve(pos)
      if ($pos.parent.type.name === 'listItem') {
        this.editor.commands.setNodeSelection($pos.before($pos.depth))
      } else {
        this.editor.commands.setNodeSelection(pos)
      }
    },
    onDragStart(event) {
      // 1. 阻止冒泡，手動接管拖曳
      event.stopPropagation()

      const { view } = this.editor
      const pos = this.getPos()
      let dragDom = view.nodeDOM(pos)
      let html = ''

      // 2. 嘗試從 DOM 構建完整的 HTML 結構
      // 這比手動操作 Slice 更穩健，因為 ProseMirror 的 HTML Parser 能自動處理 List 的合併與建立
      const { state } = this.editor
      const $pos = state.doc.resolve(pos)

      // 如果在 List 內，抓取整個 LI 並包裹在 UL/OL 中
      if ($pos.parent.type.name === 'listItem') {
        const li = this.$el.closest('li')
        if (li && li.parentElement) {
          const listParent = li.parentElement
          // 複製 LI
          const liClone = li.cloneNode(true)
          // 複製父層 List (UL/OL) 的標籤與屬性 (如 start, type)
          const wrapper = listParent.cloneNode(false)
          wrapper.appendChild(liClone)
          
          html = wrapper.outerHTML
          dragDom = li // 讓拖曳影像顯示整個 LI
        }
      }

      // 如果沒抓到 List HTML (或是普通段落)，則使用預設 DOM
      if (!html && dragDom && dragDom.nodeType === 1) {
        html = dragDom.outerHTML
      }

      // 3. 設定 DataTransfer
      event.dataTransfer.effectAllowed = 'copyMove'
      event.dataTransfer.setData('text/html', html)
      event.dataTransfer.setData('text/plain', this.node.textContent)
      
      if (dragDom && dragDom.nodeType === 1) {
        event.dataTransfer.setDragImage(dragDom, 0, 0)
      }

      // 4. 關鍵：不設定 view.dragging
      // 讓 ProseMirror 將此視為外部 HTML Drop，觸發 Parser 邏輯，解決 List 結構問題
      view.dragging = null
    },
    onDragEnd(event) {
      this.editor.view.dragging = null
      
      const { dropEffect } = event.dataTransfer
      const isExplicitCopy = event.ctrlKey || event.altKey || event.metaKey

      // 如果是移動操作 (move) 或 瀏覽器回傳 copy 但使用者沒按複製鍵 (視為移動)，則執行刪除
      if (dropEffect === 'move' || (dropEffect === 'copy' && !isExplicitCopy)) {
        // 使用 setTimeout 確保 Drop 交易已完成，避免狀態衝突
        setTimeout(() => {
          const pos = this.getPos()
          if (typeof pos === 'number') {
            const { state } = this.editor
            const $pos = state.doc.resolve(pos)
            
            // 如果是清單項目，選中整個 ListItem 進行刪除
            if ($pos.parent.type.name === 'listItem') {
              const listItemPos = $pos.before($pos.depth)
              this.editor.chain().setNodeSelection(listItemPos).deleteSelection().run()
            } else {
              // 一般區塊直接刪除
              this.editor.chain().setNodeSelection(pos).deleteSelection().run()
            }
          }
        }, 0)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.notion-row-container {
  display: flex;
  position: relative;
  margin: 2px 0;

  // 滑鼠移入該行才顯示把手
  &:hover .side-controls,
  &.is-focused .side-controls,
  .side-controls:focus-within { // 當選單開啟時，保持把手顯示
    opacity: 1;
  }

  .side-controls {
    position: absolute;
    left: -28px; // 關鍵：將把手推向左邊空白處
    top: 4px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 10;
  }

  // 當在清單內時，將把手往左推，避免與項目符號重疊
  &.is-inside-list .side-controls {
    left: -48px;
  }

  .drag-handle {
    cursor: grab;
    padding: 2px;
    border-radius: 4px;
    display: flex;
    align-items: center;

    &:hover { background-color: #efefef; }
    &:active { cursor: grabbing; }
  }

  // 選單樣式
  .block-menu {
    position: absolute;
    top: 28px;
    left: 0;
    background: white;
    border: 1px solid #e1e1e1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    padding: 4px 0;
    width: 160px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    text-align: left;

    .menu-item {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      font-size: 14px;
      color: #37352f;
      cursor: pointer;
      transition: background 0.1s;

      &:hover {
        background-color: #efefef;
      }

      .icon {
        margin-right: 8px;
        width: 20px;
        text-align: center;
        font-size: 12px;
        color: #787774;
      }
      
      &.delete-item { color: #eb5757; .icon { color: #eb5757; } }
    }

    .menu-divider {
      height: 1px;
      background: #e1e1e1;
      margin: 4px 0;
    }

    .menu-label {
      font-size: 11px;
      color: #999;
      padding: 4px 12px;
      font-weight: 600;
    }
  }
  
  .block-menu-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 90;
  }

  .content-runtime {
    flex: 1;
    width: 100%;
    outline: none;
  }
}
</style>