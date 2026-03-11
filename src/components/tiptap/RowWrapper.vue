<template>
  <node-view-wrapper class="notion-row-container" :class="{ 'is-focused': isFocused, 'is-inside-list': isInsideList }">
    <div class="side-controls" contenteditable="false">
      <!-- 加入 @click 事件 -->
      <div class="drag-handle" draggable="true" @dragstart="onDragStart" @dragend="onDragEnd" @click="handleDragClick" @mousedown="onMouseDown">
        <svg width="12" height="18" viewBox="0 0 12 18">
          <path d="M4 2h2v2H4V2zm0 5h2v2H4V7zm0 5h2v2H4v-2zm4-10h2v2H8V2zm0 5h2v2H8V7zm0 5h2v2H8v-2z" fill="rgba(55, 53, 47, 0.4)"/>
        </svg>
      </div>

      <!-- 區塊功能選單 (Block Menu) -->
      <div v-if="showMenu" class="block-menu-overlay" @click="closeMenu"></div>
      <CommandsList
        v-if="showMenu"
        class="block-menu-position"
        :items="menuItems"
        :command="handleMenuAction"
        :showDelete="true"
        menuLabel="轉換為..."
        @delete="removeNode"
      />
    </div>
    
    <!-- 針對 Table 的特殊渲染結構：必須包含 table/tbody 標籤 -->
    <TableNodeView 
      v-if="isTable" 
      :editor="editor" 
      :node="node" 
      :getPos="getPos" 
      :updateAttributes="updateAttributes" 
    />
    <!-- 針對 Code Block 的特殊渲染結構 -->
    <div v-else-if="isCodeBlock" class="code-block-container content-runtime">
      <!-- 這裡的 v-model 需改為 updateAttributes -->
      <select contenteditable="false" :value="node.attrs.language" @change="updateAttributes({ language: $event.target.value })" class="code-lang-select">
        <option :value="null">自動偵測</option>
        <option v-for="(lang, index) in languages" :key="index" :value="lang">
          {{ lang }}
        </option>
      </select>
      <pre><code><node-view-content /></code></pre>
    </div>
    <!-- 一般節點 (Paragraph, Heading) -->
    <node-view-content v-else class="content-runtime" :class="headingClass" :as="contentTag" />
  </node-view-wrapper>
</template>

<script>
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-2'
import CommandsList from './CommandsList.vue'
import TableNodeView from './TableNodeView.vue'
import { MENU_ITEMS } from '@/menuItems'

export default {
  components: { NodeViewWrapper, NodeViewContent, CommandsList, TableNodeView },
  props: nodeViewProps,
  data() {
    return {
      isFocused: false,
      showMenu: false, // 控制選單顯示
      isInsideList: false,
      languages: ['javascript', 'css', 'html', 'typescript', 'python', 'markdown'],
      menuItems: MENU_ITEMS,
    }
  },
  computed: {
    isInsideTable() {
      const pos = this.getPos()
      if (typeof pos !== 'number') {
        return false
      }
      const $pos = this.editor.state.doc.resolve(pos)
      // 從當前節點的父節點開始向上遍歷，檢查是否有 table 節點
      for (let i = $pos.depth - 1; i > 0; i--) {
        if ($pos.node(i).type.name === 'table') {
          return true
        }
      }
      return false
    },
    isTable() {
      return this.node.type.name === 'table'
    },
    isCodeBlock() {
      return this.node.type.name === 'codeBlock'
    },
    // 動態決定渲染的標籤 (p, h1, h2, h3...)
    contentTag() {
      if (this.node.type.name === 'heading') {
        return `h${this.node.attrs.level}`
      }
      return 'p'
    },
    headingClass() {
      return ''
    },
  },
  mounted() {
    // 監聽選取範圍變更，判斷是否聚焦在當前區塊
    this.editor.on('selectionUpdate', this.checkFocus)
    this.editor.on('focus', this.checkFocus)
    this.editor.on('blur', this.checkFocus)
    // 監聽 transaction 以確保結構變更 (如 Tab 縮排) 時能即時更新狀態
    this.editor.on('transaction', this.handleTransaction)

    // 優化：移除遞迴 setTimeout，改用 $nextTick 確保 DOM 掛載後執行一次檢查即可
    // 若 getPos 仍未就緒，後續的 selectionUpdate 或 transaction 會自動補正
    this.$nextTick(() => {
      if (typeof this.getPos() === 'number') {
        this.checkFocus()
        this.checkListStatus()
      }
    })
  },
  watch: {
    node() {
      this.$nextTick(() => {
        this.checkFocus()
        this.checkListStatus()
      })
    }
  },
  beforeDestroy() {
    this.editor.off('selectionUpdate', this.checkFocus)
    this.editor.off('focus', this.checkFocus)
    this.editor.off('blur', this.checkFocus)
    this.editor.off('transaction', this.handleTransaction)
  },
  methods: {
    checkFocus() {
      // 安全檢查：若組件已銷毀或找不到位置，直接返回
      if (this._isDestroyed || typeof this.getPos() !== 'function') return
      const pos = this.getPos()
      if (typeof pos !== 'number') return

      // 如果選單開啟，強制顯示
      if (this.showMenu) {
        this.isFocused = true
        return
      }
      // 如果編輯器沒有聚焦，則不顯示拖曳點
      if (!this.editor.isFocused) {
        this.isFocused = false
        return
      }

      const { selection } = this.editor.state
      // 優化：只在狀態改變時才寫入 data，避免觸發不必要的 Vue re-render
      const newFocusState = selection.from >= pos && selection.to <= (pos + this.node.nodeSize)
      if (this.isFocused !== newFocusState) {
        this.isFocused = newFocusState
      }
    },
    checkListStatus() {
      const pos = this.getPos()
      if (typeof pos !== 'number') return // checkListStatus 也需要安全檢查
      const $pos = this.editor.state.doc.resolve(pos)
      this.isInsideList = $pos.parent.type.name === 'listItem'
    },
    handleTransaction() {
      // 當編輯器狀態更新時，重新檢查此節點的聚焦和清單狀態
      // 使用 nextTick 確保在 Vue 的下一個更新週期執行，避免與 Tiptap 的渲染衝突
      this.$nextTick(() => {
        this.checkFocus()
        this.checkListStatus()
      })
    },
    handleDragClick() {
      // 如果是在表格內部，則不顯示區塊選單 (但表格本身可以顯示)
      if (this.isInsideTable) {
        return
      }
      this.toggleMenu()
    },
    toggleMenu() {
      this.showMenu = !this.showMenu
    },
    closeMenu() {
      this.showMenu = false
    },
    removeNode() {
      const pos = this.getPos()
      // 刪除時選中整個節點是正確的
      this.editor.chain().setNodeSelection(pos).deleteSelection().run()
      this.closeMenu()
    },
    handleMenuAction(item) {
      if (item.action === 'turnInto') {
        this.turnInto(item.type, item.attrs)
      } else if (item.action === 'turnIntoList') {
        this.turnIntoList(item.type)
      } else if (item.action === 'insertTable') {
        this.insertTable()
      }
    },
    turnInto(type, attrs = {}) {
      const pos = this.getPos()
      const { editor } = this
      
      // 解決 H1->H2 等標題層級切換時文字消失的問題
      // 原因：同 Node Type (heading) 更新時，ProseMirror 重用 NodeView，但 Vue 更改 tag (h1->h2) 導致 DOM 替換且內容遺失。
      // 解法：透過轉為 paragraph (不同 Node Type) 強制銷毀並重建 NodeView。
      if (this.node.type.name === 'heading' && type === 'heading' && this.node.attrs.level !== attrs.level) {
        editor.chain().setNodeSelection(pos).setNode('paragraph').run()
        
        // 直接使用閉包中的 pos，不依賴 this.getPos() (因為組件可能已銷毀)
        if (!editor.isDestroyed) {
          editor.chain().setNodeSelection(pos).setNode('heading', attrs).setTextSelection(pos + 1).run()
        }
        
        this.closeMenu()
        return
      }

      const chain = editor.chain().focus().setTextSelection(pos + 1)
      if (type === 'paragraph' && this.isInsideList) {
        chain.liftListItem('listItem')
      } else {
        chain.setNode(type, attrs)
      }
      
      chain.run()
      this.closeMenu()
    },
    turnIntoList(type) {
      const pos = this.getPos()
      this.editor.chain()
        .focus()
        .setTextSelection(pos + 1)
        .toggleList(type, 'listItem')
        .run()
      this.closeMenu()
    },
    insertTable() {
      const pos = this.getPos()
      this.editor.chain()
        .focus()
        .setTextSelection(pos + 1)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run()
      this.closeMenu()
    },
    onMouseDown() {
      // 關鍵：阻止事件冒泡，避免 ProseMirror 接收到 mousedown 後將選取範圍重置為表格內部的 CellSelection
      // event.stopPropagation() // 註解：視情況而定，有時過度阻止冒泡會導致點擊無法聚焦編輯器
      

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
    },
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
  .block-menu-position {
    position: absolute;
    top: 28px;
    left: 0;
    z-index: 100;
  }
  
  .block-menu-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 90;
  }

  .content-runtime {
    flex: 1;
    outline: none;
  }

  .code-block-container {
    position: relative;

    .code-lang-select {
      position: absolute;
      top: 2rem;
      right: 0.5rem;
      background: rgba(255, 255, 255, 0.1);
      color: #999;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 2px 4px;
      font-size: 0.7rem;
      cursor: pointer;
      z-index: 10;
      
      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    }
  }
}
</style>