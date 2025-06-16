---
layout: layouts/post.liquid
permalink: /blog/2013/05/07/create-ominibus-installer/
title: "omnibus を使って オムニバスインストーラーを作成する"
created_at: 2013-05-07 01:41:00 +9:00
kind: article
comments: true
tags:
  - packaging
---

Chef のインストールは結構面倒くさかったんだけど、[オムニバスインストーラー][Install CHef]が出たことで状況はがらっと変わって、簡単に導入できるようになった。このオムニバスインストーラーの仕組みは汎用的に作られているので、他のツールでも適用できるという話。

<!-- more -->

## オムニバスインストーラーについて

Chef のオムニバスインストーラーを実行すると以下のようなディレクトリ構成でファイルが置かれる:

- /opt/chef/bin/ ... Chef 関連のスクリプト
- /opt/chef/embedded/ ... ruby インタプリタ、Chef とその他依存パッケージ
- (/usr/bin/ ... /opt/chef/bin/ 以下のものがシンボリックリンクが配置される)

以上の通り、`/opt/chef` の中に動作に必要なものがごっそり置かれる。アプリケーションレベルでプログラミングの処理系を持っちゃうというのはこれに限らずよく見る光景で、理由としてはパッケージ提供されていない最新版が使いたかったり、バージョンアップやライブラリインストールの影響範囲を限定させたかったりだと思う。

ここしばらくは手軽なパッケージ作成ツールとして[fpm][]がよく使われているけど、オムニバスインストーラーは[omnibus][]という「ビルドツール」＋「fpm ラッパー」といった感じのもので作られている。以下は実際に [omnibus][] を使ったインストーラー作成の手順についてまとめる。

## パッケージ作成

[statsd][] および [statsd][] を動かすために必要な Node.js を /opt/statsd にインストールする RPM, Deb パッケージの作成を行ってみる。

### 環境

- Macbook Air Mountain Lion
- Ruby 2.0.0-p0
- Vagrant 1.2.2

### 手順

    # omnibus のインストール
    gem install omnibus

    # 必要となる vagrant 用の plugin をインストール
    vagrant plugin install vagrant-omnibus
    vagrant plugin install vagrant-berkshelf

    # プロジェクトディレクトリの作成(ディレクトリ名は `omnibus-プロジェクト` となる)
    omnibus project statsd
    cd omnibus-statsd

    # プロジェクトディレクトリ内のファイルを適宜修正:
        Berksfile
          Berkshelf 用の設定。変更する必要無い。
        Vagrantfile
          Vagrant 用の設定。2013-06-07 現在だと CentOS 5, 6 Ubuntu 10.04, 11.04, 12.04 の設定が導入済み。
        README.md
        omnibus.rb.example
          成果物を S3 上にキャッシュする場合などに利用。使わないなら気にしなくていい。
        config/projects/statsd.rb
          後述
        config/software/*
          後述
        package-scripts/statsd/*
          インストール時、アンインストール時などに実行したいスクリプトなど。

この中で、実際のビルドプロセスを定義するのは、config/projects/ 以下と config/software 以下になる。

`config/projects/` はプロジェクトの設定を格納するディレクトリで、初期状態では statsd 用のプロジェクトファイル `config/projects/statsd.rb` が作られている。このファイルを修正していくことになる。

    name "statsd"
    maintainer "f440"
    homepage "https://github.com/f440/omnibus-statsd"

    install_path    "/opt/statsd"
    build_version   "0.6.0"
    build_iteration 1

    dependency "preparation"
    dependency "node"
    dependency "statsd"

    exclude "\.git*"

おおむね想像がつく名前だけど、dependency だけはよく分からないと思う。dependency で指定したものはプロジェクトを構成する software という扱いで、`config/software/` 以下でその設定を行っていく。

software の例を示す。典型的な例だと、指定した URL からダウンロードしてきたものを一時ディレクトリで展開して、`configure && make && make install` を実行、などだが今回の作業では Node.js のバイナリを展開して `/opt/embedded` 以下にコピーしているだけである。

    name "node"
    version "0.10.5"

    source :url => "http://nodejs.org/dist/v0.10.5/node-v0.10.5-linux-x64.tar.gz",
           :md5 => "fb65723d395c559393201dd41e0eb275"

    relative_path "node-v0.10.5-linux-x64"

    build do
      command "rsync -av . #{install_dir}/embedded/"
    end


必要となる software の設定を全部そろえたらビルドを実行する。マシンの起動、Chef のインストール、omnibus の Cookbook 実行、ビルド環境構築、ビルド実行、パッケージ作成 といったことが行われることになるため、初回はかなり待つことになる。

    vagrant up
    (vagrant up centos-6 など、直接マシンを指定してもいい)
    (もし Linux 上で作業しているのであれば、omnibus build project statsd で直接パッケージ作成を開始出来る)

問題なければ、pkg/ 以下に statsd-0.6.0-1.el6.x86_64.rpm, statsd_0.6.0-1.ubuntu.12.04_amd64.deb といったファイルが出来る。

## まとめ

やっていることは [fpm][] でパッケージを作っているだけなんだけど、[Vagrant][] x [Berkshelf][] x [Chef][] のコンビネーションのおかげで、パッケージとそのパッケージを作るための環境が簡単に手に入るのはとてもいい。複数環境のパッケージを作る予定がなくっても、最初から[omnibus][]上でパッケージを作れるようにしておくと運用が楽そう。

## 備考

似たようなツールとして、[bunchr][] が存在する。

## 参考

- [Statsd]
- [Install Chef]
- [omnibus]
- [bunchr]
- [fpm]
- [Vagrant]
- [Berkshelf]

[Statsd]: https://github.com/etsy/statsd
[Install Chef]: http://www.opscode.com/chef/install/
[omnibus]: https://github.com/opscode/omnibus-ruby
[Chef]: http://www.opscode.com/chef/
[Berkshelf]: http://berkshelf.com/
[Vagrant]: http://www.vagrantup.com/
[bunchr]: https://github.com/joemiller/bunchr
[fpm]: https://github.com/jordansissel/fpm
[sensu]: https://github.com/sensu
