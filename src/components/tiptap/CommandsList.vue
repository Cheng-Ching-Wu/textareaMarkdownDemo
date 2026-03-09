<template>
  <div class="block-menu">
    <div v-if="showDelete" class="menu-item delete-item" @click="onDelete" @mousedown.prevent>
      <span class="icon">🗑️</span> 刪除
    </div>
    <div v-if="showDelete" class="menu-divider"></div>
    <div v-if="menuLabel" class="menu-label">{{ menuLabel }}</div>
    <div
      class="menu-item"
      :class="{ 'is-selected': index === selectedIndex }"
      v-for="(item, index) in items"
      :key="index"
      @click="selectItem(index)"
      @mousedown.prevent
      @mouseenter="selectedIndex = index"
    >
      <span class="icon" v-if="item.icon">{{ item.icon }}</span>
      {{ item.title }}
    </div>
    <div class="menu-item" v-if="items.length === 0">
      No result
    </div>
  </div>
</template>

<script>
export default {
  props: {
    items: {
      type: Array,
      required: true,
    },
    command: {
      type: Function,
      required: true,
    },
    showDelete: {
      type: Boolean,
      default: false,
    },
    menuLabel: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      selectedIndex: 0,
    }
  },
  watch: {
    items() {
      this.selectedIndex = 0
    },
  },
  methods: {
    onKeyDown({ event }) {
      if (event.key === 'ArrowUp') {
        this.upHandler()
        return true
      }
      if (event.key === 'ArrowDown') {
        this.downHandler()
        return true
      }
      if (event.key === 'Enter') {
        this.enterHandler()
        return true
      }
      return false
    },
    upHandler() {
      this.selectedIndex = ((this.selectedIndex + this.items.length) - 1) % this.items.length
    },
    downHandler() {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length
    },
    enterHandler() {
      this.selectItem(this.selectedIndex)
    },
    selectItem(index) {
      const item = this.items[index]
      if (item) {
        this.command(item)
      }
    },
    onDelete() {
      this.$emit('delete')
    },
  },
}
</script>

<style lang="scss" scoped>
.block-menu {
  background: white;
  border: 1px solid #e1e1e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  padding: 4px 0;
  width: 160px;
  display: flex;
  flex-direction: column;
  text-align: left;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif;

  .menu-item {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    font-size: 14px;
    color: #37352f;
    cursor: pointer;
    transition: background 0.1s;

    &.is-selected,
    &:hover {
      background-color: #efefef;
    }

    .icon {
      margin-right: 8px;
      width: 20px;
      text-align: center;
      font-size: 12px;
      color: #787774;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }

    &.delete-item {
      color: #eb5757;
      .icon {
        color: #eb5757;
      }
    }
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
</style>