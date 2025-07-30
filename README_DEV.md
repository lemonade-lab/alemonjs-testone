# AlemonTestOne

```sh
# 安装工具
npm install -g yo generator-code
npm install -g vsce
# 创建项目
yo code
# 打包
vsce package
# 本地加载
code --install-extension <path-to-vsix-file>
# 账户
# https://dev.azure.com/lemonadex/alemonjs
# 点击personal access token创建令牌
# 登录
vsce login lemonade-x
vsce publish
```
