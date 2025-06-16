---
layout: layouts/post.liquid
permalink: /blog/2012/06/03/sphinx-guard-livereload/
title: sphinxの更新をguard-livereloadで検知してブラウザを自動リロードする
created_at: 2012-06-03 00:00:00 +09:00
kind: article
tags:
comments: true
published: true
---
sphinxでドキュメントを書く際に生じる「文章の記述 => ビルド =>
ブラウザでの確認」という一連のサイクルを人力でやるのは効率が悪い。いろいろな省力化対策が考えられるが、ここでは guard-livereloadを使って、文章のビルドとブラウザのリロードを自動化する方法を説明する。

<!-- more -->

## 作業環境

検証に使った環境は以下の通り。環境に依存する部分は少ないので、他のOSでも動くと思う。

  * Mac OS X Lion
  * ruby 1.9.3-p194
  * sphinx 1.1.3

## 事前準備

### サーバー側準備

用意するのは3ファイル

  * Gemfile … 必要なライブラリをまとめてインストールするための設定ファイル
  * Gaurdfile … ファイルシステム監視の設定ファイル
  * Procfile … Webサーバーとファイル監視を起動するための設定ファイル

[https://gist.github.com/2862843](https://gist.github.com/2862843)

これら3ファイルをsphinxの作業ディレクトリ内に配置する。製生後のhtmlファイルは`buld/html`ディレクトリに格納されていることを期待した設定になっているので、必要であれば適宜修正する。

ファイルの設置が終わったら、ライブラリをインストールする。

    
    bundle install
    

### ブラウザ側準備

好きなブラウザにlivereloadのブラウザ拡張をインストールする。

[http://help.livereload.com/kb/general-use/browser-
extensions](http://help.livereload.com/kb/general-use/browser-extensions)

## 利用方法

サーバー側でファイルの監視とlivereloadを開始する。

    
    foreman start
    

ブラウザで http://localhost:3000/ (3000以外にしたい場合は Procfile 内で変更)にアクセスしてlivereloadのブラウザ拡張を有効化すれば、あとはファイルの更新に合わせて自動的にビルドとブラウザのリロードが行われる。

## 参考

  * [LiveReloadが超気持ちいい2011](http://aligach.net/diary/20110925.html) Livereloadの詳しい説明
  * [Auto Reload](https://addons.mozilla.org/en-US/firefox/addon/auto-reload/) ローカルファイルの更新を検知してFirefoxをリロードしてくれるアドオン。試してみたけど、自分の環境ではリロードがうまく動かなかった。

