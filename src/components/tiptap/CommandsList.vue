<template>
  <div class="items">
    <button
      class="item"
      :class="{ 'is-selected': index === selectedIndex }"
      v-for="(item, index) in items"
      :key="index"
      @click="selectItem(index)"
    >
      {{ item.title }}
    </button>
  </div>
</template>

<script>
export default {
  props: ['items', 'command'],
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
        this.selectedIndex = (this.selectedIndex + this.items.length - 1) % this.items.length
        return true
      }
      if (event.key === 'ArrowDown') {
        this.selectedIndex = (this.selectedIndex + 1) % this.items.length
        return true
      }
      if (event.key === 'Enter') {
        this.selectItem(this.selectedIndex)
        return true
      }
      return false
    },
    selectItem(index) {
      const item = this.items[index]
      if (item) {
        this.command(item)
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.items {
  padding: 0.2rem;
  position: relative;
  border-radius: 0.5rem;
  background: #FFF;
  color: rgba(0, 0, 0, 0.8);
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0px 10px 20px rgba(0, 0, 0, 0.1);
}
.item {
  display: block;
  margin: 0;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  &:hover, &.is-selected {
    background: #f3f4f6;
  }
}
</style>