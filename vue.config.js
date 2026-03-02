// vue.config.js
const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  // 1. 關鍵修正：設定生產環境下的資源路徑
  // 必須與你的倉庫名稱 "textareaMarkdownDemo" 完全一致
  publicPath: process.env.NODE_ENV === 'production'
    ? '/textareaMarkdownDemo/'
    : '/',

  transpileDependencies: [
    // 雖然改用 Tiptap 了，但保留這行不會有影響
    '@milkdown'
  ],

  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto'
        }
      ]
    }
  }
})