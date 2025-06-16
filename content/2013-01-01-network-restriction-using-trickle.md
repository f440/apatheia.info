---
layout: layouts/post.liquid
permalink: /blog/2013/01/01/network-restriction-using-trickle/
title: Trickleを使って帯域制限をする
created_at: 2013-01-01 17:05:00 +9:00
kind: article
comments: true
tags:
  - unix
  - linux
  - network
---

ネットワーク経由で大量のデータをやりとりしたいが、メインのサービスには影響を与えたくないという場合がよくある。`rsync`や`scp` など、大きなファイルの転送を考慮されたコマンドではネットワーク帯域を制限するオプションが用意されていることも多いが、自作のツールなどに帯域制限を実装するとなるとかなり面倒くさいことになる。

<!-- more -->

Linux で帯域制限をしたい場合、tc や cgroup を使う方法がよく知られている。ただ、「あるコマンドにネットワークが占領されないように穏やかに実行したい」というニーズに対しては大げさで、またオプションが難解だったり管理権限が必要だったりといったことから二の足を踏む感じのものだった。もっと普段使いに適したツールがないものかと探していたところ、こういったシーンでは[Tricle][trickle]がかなり有効だと言うことがわかった。

## インストール

Debian, Ubuntu なら公式からパッケージが提供されている。RHEL 系 OS であれば、EPEL にパッケージがあるのでそちらを利用。

## 使い方

### trickle

コマンドの前に `trickle` をつけるだけで、簡単に帯域制限が実現できる。とりあえず、「`-d n`で n KByte/sec にダウンロードが制限」、「`-u n`で n KByte/sec に制限」だけ覚えておけばいい。

    # wget のダウンロード速度を 20 KBpsに制限する例
    #  (本当は wget も curl も --limit-rate オプションが元々あるので、こんなことしなくても大丈夫)
    trickle -d 20 wget --verbose http://ftp.jaist.ac.jp/pub/Linux/ArchLinux/iso/2012.12.01/archlinux-2012.12.01-dual.iso

実行時、`trickled` が見つからないというメッセージが出るが、これは`-s`(standaloneモード)をつけることで抑制できる。

### trickled

`trickled` というプログラムも利用できるようになって、`tricle`と同様にオプション`-d`, `-u`が設定可能。`trickled`を一度起動するとデーモンとなり、以降`trickle`を使って起動したコマンドの帯域は、`trickled`起動時のオプションで設定した値までに制限される。複数個のプログラムを `trickle` で起動した場合、使用している帯域の総和が `trickled`の設定値に従うことになる。

## 参考

- [配布元][trickle]
- [仕組み](http://monkey.org/~marius/trickle/trickle.pdf)

[trickle]: http://monkey.org/~marius/pages/?page=trickle "trickle公式"
