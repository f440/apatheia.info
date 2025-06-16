---
layout: layouts/post.liquid
permalink: /blog/2016/02/22/install-dlite/
title: "DLiteでOS X上にDockerの環境を構築する"
created_at: 2016-02-22 20:54:00 +9:00
updated_at: 2016-05-08 19:12:00 +9:00
kind: article
comments: true
tags:
  - docker
---

[DLite][dlite] をインストールしたので、そのときのメモ。

<!-- more -->

## DLiteとは

OS XでDockerを使えるようにやつ。内部では[xhyve](https://github.com/mist64/xhyve)を使っていて非常にコンパクト。

## 作業環境

- DLite 1.1.3
- OS X El capitan 10.11.3

## インストール手順

    brew install dlite
    sudo dlite install # CPUやディスクサイズなどのオプションは`-h`で確認可能

おしまい。

内部では以下が行われる:

- `/etc/sudoers`に`dlite,nfs`コマンドをパスワードなしで`sudo`できるようにする設定を追加
- `~/Library/LaunchAgents/local.dlite.plist`に起動設定を配置
- `~/.dlite`に起動イメージをダウンロード

## 起動

Tmux内で起動しようとするとエラーになるので、必ずTmux外でやること。

    dlite start

問題がなければ以下が加えられる:

- `/var/run/docker.sock` にソケットファイルを作成
- `/etc/hosts` にdliteへの参照を追加 (デフォルトは `local.docker`。インストール時のオプションで変更可能)
- `/etc/exports` にDLite側のホストへのNFSマウントする設定を追加
- `~/Library/LaunchAgents/local.dlite.plist` をロードし、自動起動するように設定

うまくいっていれば、`docker -H unix://var/run/docker.sock`(`export DOCKER_HOST=unix:///var/run/docker.sock`で指定も可)でdockerが使えるようになる。

もしうまくいかないようなら、`sudo dlite daemon`でコマンドラインから実行して原因を突き止める。とくに、NFS周りのコンフリクトが起きていないかを確認。

## まとめ

ホストと仮想環境の間がシームレスにつながってcoLinuxっぽさがある。こういうすっきりしたツールは楽しい。

## 追記

2016-05-08: 現在はDocker for Macを利用している。osxfsでファイルシステムのイベントが連携できて便利。

## 参考

- [GitHub - nlf/dlite: The simplest way to use Docker on OS X][dlite]
- [Simplifying Docker on OS X](https://blog.andyet.com/2016/01/25/easy-docker-on-osx/)

[dlite]: https://github.com/nlf/dlite
