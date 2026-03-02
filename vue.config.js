// vue.config.js

const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: [
    // 告訴 Babel 專門去處理 node_modules 裡的 milkdown 相關套件
    '@milkdown'
  ],
  // 如果你的 Webpack 在處理 ESM 模組時還有問題，可以加入這段 (選填)
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