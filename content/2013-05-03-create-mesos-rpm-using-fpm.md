---
layout: layouts/post.liquid
permalink: /blog/2013/05/03/create-mesos-rpm-using-fpm/
title: "fpm で Mesos の RPM を作るまで"
created_at: 2013-05-03 17:24:00 +9:00
kind: article
comments: true
tags:
  - packaging
  - mesos
---

[Mesos] をインストールするとき各マシンでビルドはしんどいので、[fpm] で Mesos の RPM を作ってインストールしている。ビルドからパッケージ作成までの作業ログを残しておく。

<!-- more -->

- [fpm] は Ruby の gem や Node.js の npm などのプログラミング言語のライブラリ、あるいは直接ディレクトリから RPM やら Deb やらのパッケージを作成するソフトウェア。
- [Mesos] はクラスタ構成のリソースをよしなに管理するソフトウェア。
  - 今回の話では具体的な使い方までは触れない

## 手順

作業環境は CentOS 6.4 x86\_64。

 Ruby をインストール。

    sudo yum install ruby.x86_64 rubygems ruby-devel.x86_64 rpm-build.x86_64

fpm をインストール。

    sudo gem install fpm --no-rdoc --no-ri

Mesos のソースをダウンロード、展開。

    curl -LO http://ftp.meisei-u.ac.jp/mirror/apache/dist/incubator/mesos/mesos-0.10.0-incubating/mesos-0.10.0-incubating.tar.gz
    tar xf mesos-0.10.0-incubating.tar.gz
    cd mesos-0.10.0

Mesos のビルドに必要なパッケージをインストール。

    sudo yum install gcc-c++.x86_64 patch.x86_64 python-devel.x86_64 \
      cppunit-devel.x86_64 java-1.6.0-openjdk-devel.x86_64

ビルド。今回は、configure のオプションで Redhat っぽい配置を指定している。`/opt/mesos` とか `/usr/local/mesos` に全部まとめたければ --prefix を使うなど、このあたりはお好みで。
`make install` 時には書き込み可能な場所を DESTDIR で指定。説明中では、`/tmp/mesos` を利用している。

    JAVA_HOME=/etc/alternatives/java_sdk ./configure \
      --bindir=/usr/bin --sbindir=/usr/sbin --libexecdir=/usr/libexec \
      --localstatedir=/var --libdir=/usr/lib64 --includedir=/usr/include \
      --datarootdir=/usr/share
    make
    make install DESTDIR=/tmp/mesos

fpm でパッケージを作成。詳細は fpm --help を参照。注意点としては、`--description` は RPM のメタ情報 `description`, `summary` で兼用されるので、あまり長い情報を入れると `yum search` とかがごちゃごちゃすることになる。適度に切り詰めた方がいい。

    fpm -s dir -t rpm \
      -v 0.10.0 \
      -n mesos \
      -C /tmp/mesos \
      -a x86_64 \
      --license "ASL 2.0" \
      --url "http://incubator.apache.org/mesos/" \
      --description "Dynamic resource sharing for clusters" \
      -d python-devel \
      -d java-1.6.0-openjdk-devel \
      .

RPM ファイルのメタ情報やファイル一覧をチェック。

    rpm -qpi mesos-0.10.0-1.x86_64.rpm
    rpm -qpl mesos-0.10.0-1.x86_64.rpm

あとは、できあがった RPM ファイルを他のマシンに持っていってインストール。

    sudo yum install ./mesos-0.10.0-1.x86_64.rpm

[Mesos]: http://incubator.apache.org/mesos/
[fpm]: https://github.com/jordansissel/fpm
