<template>
  <!-- 針對 Table 的特殊渲染結構 -->
  <div class="table-block-wrapper" style="position: relative; width: 100%; min-width: 0;">
    <div class="content-runtime" style="overflow-x: auto; overflow-y: hidden; padding: 16px 24px 24px 16px; position: relative;" @mousemove="throttledTableMouseMove" @mouseleave="hoverResizeHandle = null">
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
      <!-- 新增行列按鈕 -->
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

    <!-- 表格專用選單 -->
    <div v-if="activeTableMenu" class="block-menu-overlay" @click="closeTableMenu"></div>
    <CommandsList
      v-if="activeTableMenu"
      class="block-menu-position"
      :style="{ top: activeTableMenu.top + 'px', left: activeTableMenu.left + 'px', position: 'fixed', marginTop: 0 }"
      :items="tableMenuItems"
      :command="handleTableMenuAction"
    />
  </div>
</template>

<script>
import { NodeViewContent } from '@tiptap/vue-2'
import CommandsList from './CommandsList.vue'

export default {
  name: 'TableNodeView',
  components: { NodeViewContent, CommandsList },
  props: {
    editor: { type: Object, required: true },
    node: { type: Object, required: true },
    getPos: { type: Function, required: true },
    updateAttributes: { type: Function, required: true },
  },
  data() {
    return {
      tableMap: { cols: [], rows: [] },
      activeTableMenu: null,
      hoverResizeHandle: null,
      isResizing: false,
      resizeState: null,
      mouseMoveFrame: null,
    }
  },
  computed: {
    modelColWidths() {
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
    this.updateTableMap()
  },
  updated() {
    this.updateTableMap()
  },
  beforeDestroy() {
    if (this.mouseMoveFrame) cancelAnimationFrame(this.mouseMoveFrame)
    document.removeEventListener('mousemove', this.onResizeMove)
    document.removeEventListener('mouseup', this.onResizeEnd)
  },
  methods: {
    throttledTableMouseMove(e) {
        if (this.mouseMoveFrame) return
        this.mouseMoveFrame = requestAnimationFrame(() => {
            this.onTableMouseMove(e)
            this.mouseMoveFrame = null
        })
    },
    onTableMouseMove(e) {
      if (this.isResizing) return
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
      
      const newWidths = [...this.resizeState.startWidths]
      newWidths[this.resizeState.index] = Math.max(20, newWidths[this.resizeState.index] + dx)
      this.resizeState.currentWidths = newWidths
      
      let newLeft = 0
      for (let i = 0; i <= this.resizeState.index; i++) {
        newLeft += newWidths[i]
      }
      this.resizeState.currentLeft = newLeft
    },
    onResizeEnd() {
      if (!this.resizeState) return
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

      this.node.forEach((rowNode, rowOffset) => {
        rowNode.forEach((cellNode, cellOffset, cellIndex) => {
          const cellAbsPos = tableStartPos + 1 + rowOffset + 1 + cellOffset;
          const newWidth = widths[cellIndex];
          if (newWidth !== undefined && cellNode.attrs.colwidth?.[0] !== newWidth) {
            tr.setNodeMarkup(cellAbsPos, null, { ...cellNode.attrs, colwidth: [newWidth] });
          }
        });
      });

      if (tr.docChanged) this.editor.view.dispatch(tr);
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
      this.activeTableMenu = {
        type,
        index,
        top: event.clientY + 10,
        left: event.clientX
      }
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
      const lastCell = rows[0].lastElementChild
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
.table-resize-handle {
  position: absolute;
  top: 0; bottom: 0; width: 4px;
  background-color: #2383e2;
  cursor: col-resize; z-index: 20;
  transform: translateX(-2px);
}
.table-controls {
  position: absolute; top: 0; left: 0;
  pointer-events: none; z-index: 1;
}
.table-axis {
  display: flex; position: absolute;
  &.x-axis {
    left: 16px; top: 0; height: 16px; transform: translateY(50%);
    .axis-handle { justify-content: center; align-items: flex-end; z-index: 999; }
    .handle-trigger { margin-bottom: 2px; }
    .dots { transform: rotate(90deg); }
  }
  &.y-axis {
    top: 16px; left: 0; width: 16px; flex-direction: column; transform: translateX(50%);
    .axis-handle { align-items: center; justify-content: flex-end; }
    .handle-trigger { margin-right: 2px; }
  }
}
.axis-handle {
  pointer-events: auto; position: relative; display: flex;
  align-items: center; justify-content: center; opacity: 0;
  transition: all 0.2s ease-in-out;
  &:hover, &.is-active { opacity: 1; }
}
.handle-trigger {
  width: 14px; height: 14px; background-color: #fff;
  border: 1px solid #e0e0e0; border-radius: 3px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: all 0.2s;
  &:hover { background-color: #f0f0f0; border-color: #ccc; }
  .dots { width: 2px; height: 2px; background-color: #999; border-radius: 50%; box-shadow: 0 -3px 0 #999, 0 3px 0 #999; }
}
.add-button-trigger {
  border: 1px solid #c5c5c5; border-radius: 3px; position: absolute;
  pointer-events: auto; display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.2s; cursor: pointer;
  .plus-icon {
    background: #eee; border-radius: 3px; display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: #666; line-height: 1;
    &:hover { background: #ddd; color: #333; }
  }
  &.bottom .plus-icon { width: 100%; height: 16px; }
  &.right .plus-icon { width: 16px; height: 100%; }
  &:hover { opacity: 1; }
}
.block-menu-position { position: absolute; top: 28px; left: 0; z-index: 100; }
.block-menu-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 90; }
</style>