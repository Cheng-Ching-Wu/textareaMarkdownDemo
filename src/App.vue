<template>
  <div id="app">
    <div class="nav-menu">
      <router-link to="/">tiptap</router-link>
      <router-link to="/vditor">vditor</router-link>
      <router-link to="/editorjs">editorjs</router-link>
    </div>
    <div>
      <router-view></router-view>
    </div>
  </div>
</template>

<script>

export default {
  name: 'App',
  components: {
    // HelloWorld
  },
  data() {
    return {
      content: ''
    }
  }
}
</script>

<style lang="scss" scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.nav-menu a {
  text-decoration: none;
  color: #2c3e50;
  padding: 8px 12px;
  border-radius: 4px;
  margin: 0 4px;
  transition: background-color 0.2s;
}

.nav-menu a:hover {
  background-color: #e2e8f0;
}

.nav-menu .router-link-exact-active {
  color: #fff;
  background-color: #1782ec;
  padding: 8px 12px;
  border-radius: 4px;
  font-weight: bold;

  &:hover {
    background-color: #0b5dc7;
  }
}
</style>
