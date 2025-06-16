---
layout: layouts/post.liquid
permalink: /blog/2013/02/03/installing-node-dot-js-on-windows-7/
title: "Windows 上に node.js の開発環境を整える"
created_at: 2013-02-03 21:11:00 +9:00
kind: article
comments: true
tags:
  - node.js
  - windows
---

一身上の都合で Windows 7 上に Node.js の開発環境を整えたんだけど、コマンドラインからの操作だけで開発環境がそろう時代になっていたことに驚いた。

そのときの作業メモ。

<!-- more -->

コマンドプロンプト起動:

    # Chocolatey のインストール
    @powershell -NoProfile -ExecutionPolicy unrestricted -Command "iex ((new-object net.webclient).DownloadString('http://chocolatey.org/install.ps1'))" && SET PATH=%PATH%;%systemdrive%\chocolatey\bin
    # システムドライブ直下にインストールするの微妙……
    # 追記: [システムディスクの直下にインストールする理由](https://github.com/chocolatey/chocolatey/wiki/DefaultChocolateyInstallReasoning)

   
    # パッケージのダウンロード&インストール
    cinst nodejs.install
    # nodejs.install ではなく nodejs だけだとコマンドライン版プログラムだけ
    # インストールされる。別途 npm を用意する必要が出てくるので
    # パッケージを使った方が楽
   
    # Node.js にパスを通す
    set PATH=%PATH%;%ProgramFiles(x86)%\nodejs

    # ちゃんと動くかどうか、試しに grunt をインストールしてみる
    mkdir test
    cd test
    npm install grunt
   
あとは好みにあわせて開発ツールを `cinst` でインストールしていく

- バージョン管理 (git ...)
- エディタ (sublimetext2, vim ...)
- データストア (redis, mongodb ...)
- ユーティリティ (Gow, ...)

## 参考

- [node.js](http://nodejs.org/)
- [chocolatey](http://chocolatey.org/)
