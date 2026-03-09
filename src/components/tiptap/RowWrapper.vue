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
    <div v-if="isTable" class="table-block-wrapper" style="position: relative; width: 100%; min-width: 0;">
      <div class="content-runtime" style="overflow-x: auto; overflow-y: hidden; padding: 16px 24px 24px 16px; position: relative;" @mousemove="onTableMouseMove" @mouseleave="hoverResizeHandle = null">
        <!-- 表格行列控制項 -->
        <div class="table-controls" contenteditable="false">
          <div class="table-axis x-axis">
            <div v-for="(w, i) in tableMap.cols" :key="'col-'+i" class="axis-handle" :class="{ 'is-active': activeTableMenu && activeTableMenu.type === 'col' && activeTableMenu.index === i }" :style="{ width: w + 'px' }">
              <div class="handle-trigger" @click="showTableMenu('col', i, $event)"><div class="dots"></div></div>
            </div>
          </div>
          <div class="table-axis y-axis">
            <div v-for="(h, i) in tableMap.rows" :key="'row-'+i" class="axis-handle" :class="{ 'is-active': activeTableMenu && activeTableMenu.type === 'row' && activeTableMenu.index === i }" :style="{ height: h + 'px' }">
              <div class="handle-trigger" @click="showTableMenu('row', i, $event)"><div class="dots"></div></div>
            </div>
          </div>
        </div>
        <table style="width: fit-content; table-layout: fixed; border-collapse: collapse" ref="table">
            <colgroup>
                <col v-for="(w, i) in displayColWidths" :key="i" :style="{ width: w ? w + 'px' : '' }" />
            </colgroup>
            <node-view-content as="tbody" />
        </table>
        <div v-if="hoverResizeHandle || isResizing"
            class="table-resize-handle"
            :style="{ left: ((isResizing ? resizeState.currentLeft : hoverResizeHandle.left) + 16) + 'px', height: tableHeight + 'px', top: '16px' }"
            @mousedown.stop.prevent="startResize"
        ></div>
        <!-- 新增行列按鈕 (移回滾動容器內部，避免遮擋滾動條並跟隨滾動) -->
        <div class="add-button-trigger right" 
              :style="{ left: (tableWidth + 16 + 4) + 'px', top: '16px', height: tableHeight + 'px' }"
              @click="addColumnAfterLast">
          <div class="plus-icon">+</div>
        </div>
        <div class="add-button-trigger bottom" 
              :style="{ top: (tableHeight + 16 + 4) + 'px', left: '16px', width: tableWidth + 'px' }"
              @click="addRowAfterLast">
          <div class="plus-icon">+</div>
        </div>
      </div>
    </div>
    <!-- 針對 Code Block 的特殊渲染結構 -->
    <div v-else-if="isCodeBlock" class="code-block-container content-runtime">
      <select contenteditable="false" v-model="selectedLanguage" class="code-lang-select">
        <option :value="null">自動偵測</option>
        <option v-for="(lang, index) in languages" :key="index" :value="lang">
          {{ lang }}
        </option>
      </select>
      <pre><code><node-view-content /></code></pre>
    </div>
    <!-- 一般節點 (Paragraph, Heading) -->
    <node-view-content v-else class="content-runtime" :class="headingClass" :as="contentTag" />

    <!-- 表格專用選單 -->
    <div v-if="activeTableMenu" class="block-menu-overlay" @click="closeTableMenu"></div>
    <CommandsList
      v-if="activeTableMenu"
      class="block-menu-position"
      :style="{ top: activeTableMenu.top + 'px', left: activeTableMenu.left + 'px', position: 'fixed', marginTop: 0 }"
      :items="tableMenuItems"
      :command="handleTableMenuAction"
    />
  </node-view-wrapper>
</template>

<script>
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-2'
import CommandsList from './CommandsList.vue'
import { MENU_ITEMS } from '@/menuItems'

export default {
  components: { NodeViewWrapper, NodeViewContent, CommandsList },
  props: nodeViewProps,
  data() {
    return {
      isFocused: false,
      showMenu: false, // 控制選單顯示
      isInsideList: false,
      languages: ['javascript', 'css', 'html', 'typescript', 'python', 'markdown'],
      hoverResizeHandle: null,
      isResizing: false,
      resizeState: null,
      menuItems: MENU_ITEMS,
      tableMap: { cols: [], rows: [] },
      activeTableMenu: null,
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
    selectedLanguage: {
      get() {
        return this.node.attrs.language
      },
      set(language) {
        this.updateAttributes({ language })
      },
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
    modelColWidths() {
      if (!this.isTable) return []
      const firstRow = this.node.content.firstChild
      if (!firstRow) return []
      const widths = []
      firstRow.content.forEach(cell => {
        widths.push(cell.attrs.colwidth && cell.attrs.colwidth.length ? cell.attrs.colwidth[0] : 200)
      })
      return widths
    },
    displayColWidths() {
      if (this.isResizing && this.resizeState) {
        return this.resizeState.currentWidths
      }
      return this.modelColWidths
    },
    tableMenuItems() {
      if (!this.activeTableMenu) return []
      if (this.activeTableMenu.type === 'col') {
        return [
          { title: '向左插入欄', action: 'addColumnBefore' },
          { title: '向右插入欄', action: 'addColumnAfter' },
          { title: '刪除此欄', action: 'deleteColumn', style: 'color: red' }
        ]
      } else {
        return [
          { title: '向上插入列', action: 'addRowBefore' },
          { title: '向下插入列', action: 'addRowAfter' },
          { title: '刪除此列', action: 'deleteRow', style: 'color: red' }
        ]
      }
    },
    tableWidth() {
      return this.tableMap.cols.reduce((a, b) => a + b, 0)
    },
    tableHeight() {
      return this.tableMap.rows.reduce((a, b) => a + b, 0)
    },
  },
  mounted() {
    // 監聽選取範圍變更，判斷是否聚焦在當前區塊
    this.editor.on('selectionUpdate', this.checkFocus)
    this.editor.on('focus', this.checkFocus)
    this.editor.on('blur', this.checkFocus)
    // 監聽 transaction 以確保結構變更 (如 Tab 縮排) 時能即時更新狀態
    this.editor.on('transaction', this.handleTransaction)
  
    // 使用遞迴 retry 機制，確保在表格等複雜節點插入後，getPos() 能正確回傳數值
    // 解決插入表格後，因 getPos() 暫時為 undefined 導致拖曳點消失的問題
    const initCheck = (attempts = 0) => {
      if (this._isDestroyed) return
      const pos = this.getPos()
      if (typeof pos === 'number') {
        this.checkFocus()
        this.checkListStatus()
      } else if (attempts < 10) { // 重試 10 次，每次間隔 20ms
        setTimeout(() => initCheck(attempts + 1), 20)
      }
    }
    initCheck()
    if (this.isTable) {
      this.updateTableMap()
    }
  },
  watch: {
    // 監聽 node 變化，確保當節點類型改變 (如轉為表格) 時，能重新檢查聚焦狀態
    node() {
      this.$nextTick(() => {
        this.checkFocus()
        this.checkListStatus()
      })
    }
  },
  updated() {
    if (this.isTable) {
      this.updateTableMap()
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
      const pos = this.getPos()
      // 簡單判斷：游標選取範圍是否完全落在當前節點內
      if (typeof pos === 'number') {
        this.isFocused = selection.from >= pos && selection.to <= (pos + this.node.nodeSize)
      } else {
        // 如果 getPos() 失敗 (例如在節點快速替換的過渡期)，安全起見先隱藏
        this.isFocused = false
      }
    },
    checkListStatus() {
      const pos = this.getPos()
      if (typeof pos !== 'number') return
      const $pos = this.editor.state.doc.resolve(pos)
      this.isInsideList = $pos.parent.type.name === 'listItem'
    },
    handleTransaction() {
      // 當編輯器狀態更新時，重新檢查此節點的聚焦和清單狀態
      // 使用 nextTick 確保在 Vue 的下一個更新週期執行，避免與 Tiptap 的渲染衝突
      this.$nextTick(() => {
        if (this.editor.isDestroyed || this.getPos() === undefined) return
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
    },
    onTableMouseMove(e) {
      if (this.isResizing || !this.isTable) return
      const table = this.$refs.table
      if (!table) return
      
      const rect = table.getBoundingClientRect()
      const x = e.clientX - rect.left
      
      const row = table.querySelector('tr')
      if (!row) return
      
      let currentX = 0
      const cells = Array.from(row.children)
      for (let i = 0; i < cells.length; i++) {
        currentX += cells[i].offsetWidth
        // 偵測是否接近欄位右邊界 (5px 緩衝區)
        if (Math.abs(x - currentX) < 5) {
          this.hoverResizeHandle = { index: i, left: currentX }
          return
        }
      }
      this.hoverResizeHandle = null
    },
    startResize(e) {
      if (!this.hoverResizeHandle) return
      this.isResizing = true
      
      // 關鍵修正：取得當前所有欄位的「實際像素寬度」，確保拖曳時所有欄位都有明確數值
      const table = this.$refs.table
      const firstRow = table.querySelector('tr')
      const cells = Array.from(firstRow.children)
      const currentWidths = cells.map(c => c.offsetWidth)

      this.resizeState = {
        index: this.hoverResizeHandle.index,
        startX: e.clientX,
        startLeft: this.hoverResizeHandle.left,
        startWidths: currentWidths,
        currentWidths: currentWidths,
        currentLeft: this.hoverResizeHandle.left
      }
      document.addEventListener('mousemove', this.onResizeMove)
      document.addEventListener('mouseup', this.onResizeEnd)
    },
    onResizeMove(e) {
      if (!this.resizeState) return
      const dx = e.clientX - this.resizeState.startX
      
      // 1. 更新當前欄位寬度
      const newWidths = [...this.resizeState.startWidths]
      newWidths[this.resizeState.index] = Math.max(20, newWidths[this.resizeState.index] + dx)
      this.resizeState.currentWidths = newWidths
      
      // 2. 更新把手位置 (跟隨新的欄位邊界)
      let newLeft = 0
      for (let i = 0; i <= this.resizeState.index; i++) {
        newLeft += newWidths[i]
      }
      this.resizeState.currentLeft = newLeft
    },
    onResizeEnd() {
      if (!this.resizeState) return
      
      // 將最終寬度寫入所有欄位
      this.updateAllColumnWidths(this.resizeState.currentWidths)
      
      this.isResizing = false
      this.resizeState = null
      this.hoverResizeHandle = null
      document.removeEventListener('mousemove', this.onResizeMove)
      document.removeEventListener('mouseup', this.onResizeEnd)
    },
    updateAllColumnWidths(widths) {
      const { tr } = this.editor.state;
      const tableStartPos = this.getPos();

      // 使用 node.forEach 遍歷所有 row，此方法比手動計算位置更可靠
      this.node.forEach((rowNode, rowOffset) => {
        // 遍歷該 row 中的所有 cell
        rowNode.forEach((cellNode, cellOffset, cellIndex) => {
          const cellAbsPos = tableStartPos + 1 + rowOffset + 1 + cellOffset;
          const newWidth = widths[cellIndex];

          if (newWidth !== undefined && cellNode.attrs.colwidth?.[0] !== newWidth) {
            tr.setNodeMarkup(cellAbsPos, null, { ...cellNode.attrs, colwidth: [newWidth] });
          }
        });
      });

      if (tr.docChanged) {
        this.editor.view.dispatch(tr);
      }
    },
    updateTableMap() {
      const table = this.$refs.table
      if (!table) return
      
      const rows = Array.from(table.querySelectorAll('tr'))
      const rowHeights = rows.map(r => r.offsetHeight)
      
      const firstRow = rows[0]
      const colWidths = firstRow ? Array.from(firstRow.children).map(c => c.offsetWidth) : []
      
      if (JSON.stringify(this.tableMap.rows) !== JSON.stringify(rowHeights) ||
          JSON.stringify(this.tableMap.cols) !== JSON.stringify(colWidths)) {
        this.tableMap = { rows: rowHeights, cols: colWidths }
      }
    },
    showTableMenu(type, index, event) {
      // 設定選單位置 (使用 fixed positioning)
      this.activeTableMenu = {
        type,
        index,
        top: event.clientY + 10,
        left: event.clientX
      }
      
      // 選中對應的欄或列，以便執行命令
      this.setSelectionInTable(type, index)
    },
    closeTableMenu() {
      this.activeTableMenu = null
    },
    handleTableMenuAction(item) {
      this.editor.chain().focus()[item.action]().run()
      this.closeTableMenu()
    },
    setSelectionInTable(type, index) {
      const table = this.$refs.table
      if (!table) return
      const rows = table.querySelectorAll('tr')
      let cell = null
      if (type === 'col') {
        const firstRow = rows[0]
        if (firstRow) cell = firstRow.children[index]
      } else {
        const row = rows[index]
        if (row) cell = row.children[0]
      }
      if (cell) {
        const pos = this.editor.view.posAtDOM(cell, 0)
        this.editor.chain().focus().setTextSelection(pos).run()
      }
    },
    addColumnAfterLast() {
      const table = this.$refs.table
      if (!table) return
      const rows = table.querySelectorAll('tr')
      if (rows.length === 0) return
      const firstRow = rows[0]
      const lastCell = firstRow.lastElementChild
      if (lastCell) {
        const pos = this.editor.view.posAtDOM(lastCell, 0)
        this.editor.chain().focus().setTextSelection(pos).addColumnAfter().run()
      }
    },
    addRowAfterLast() {
      const table = this.$refs.table
      if (!table) return
      const rows = table.querySelectorAll('tr')
      if (rows.length === 0) return
      const lastRow = rows[rows.length - 1]
      const firstCell = lastRow.firstElementChild
      if (firstCell) {
        const pos = this.editor.view.posAtDOM(firstCell, 0)
        this.editor.chain().focus().setTextSelection(pos).addRowAfter().run()
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

  .table-resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 4px;
    background-color: #2383e2;
    cursor: col-resize;
    z-index: 20;
    transform: translateX(-2px); /* 讓把手居中於格線 */
  }

  .table-controls {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 1;
  }
  .table-axis {
    display: flex;
    position: absolute;
  }
  .table-axis.x-axis {
    left: 16px;
    top: 0;
    height: 16px;
    transform: translateY(50%);

    .axis-handle {
      justify-content: center;
      align-items: flex-end;
      z-index: 999;
    }

    .handle-trigger {
      margin-bottom: 2px;
    }

    .dots {
      transform: rotate(90deg);
    }
  }
  .table-axis.y-axis {
    top: 16px;
    left: 0;
    width: 16px;
    flex-direction: column;
    transform: translateX(50%);

    .axis-handle {
      align-items: center;
      justify-content: flex-end;
    }

    .handle-trigger {
      margin-right: 2px;
    }
  }
  .axis-handle {
    pointer-events: auto;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.2s ease-in-out;

    &:hover,
    &.is-active {
      opacity: 1;
    }
  }
  .handle-trigger {
    width: 14px;
    height: 14px;
    background-color: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 3px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    transition: all 0.2s;

    &:hover {
      background-color: #f0f0f0;
      border-color: #ccc;
    }

    .dots {
      width: 2px;
      height: 2px;
      background-color: #999;
      border-radius: 50%;
      box-shadow: 0 -3px 0 #999, 0 3px 0 #999;
    }
  }

  .add-button-trigger {
    border: 1px solid #c5c5c5;
    border-radius: 3px;
    position: absolute;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
    cursor: pointer;
    
    .plus-icon {
      background: #eee;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: #666;
      line-height: 1;
      &:hover {
          background: #ddd;
          color: #333;
      }
    }

    &.bottom {
      
      .plus-icon {
        width: 100%;
        height: 16px;
      }
    }

    &.right {

      .plus-icon {
        width: 16px;
        height: 100%;
      }
    }

    &:hover {
      opacity: 1;
    }
  }
}
</style>