---
layout: layouts/post.liquid
permalink: /blog/2012/10/07/sub-for-subcommands/
title: "サブコマンドを sub で処理する"
created_at: 2012-10-07 22:13:00 +9:00
kind: article
comments: true
tags:
  - cli
  - shell
  - unix
---

[sub][] は [37signals][] が公開しているスクリプト群。サブコマンド付きのコマンドを作りたいとき、補完やヘルプメッセージなどの便利な機能を提供してくれる。

<!-- more -->

## 使い方

以下の簡単なコマンドを作って、動作を確認してみることにする。

    ex. browse safari http://google.com/
    
    コマンド browse にサブコマンドでブラウザ(safari, chrome, opera, ...)を与え、
    最後の引数で渡された URL が開く。URL が渡されなければ、ブラウザの起動のみ行う。

なお、確認はすべて Mac OS X 10.8 上 の zsh で行っている。

### 初期化

    $ git clone git://github.com/37signals/sub.git browse
    $ cd browse
    $ ./prepare.sh browse
    # 以下のメッセージが表示される

    Preparing your 'browse' sub!
    Done! Enjoy your new sub! If you're happy with your sub, run:
    
        rm -rf .git
        git init
        git add .
        git commit -m 'Starting off browse'
        ./bin/browse init
    
    Made a mistake? Want to make a different sub? Run:
        git add .
        git checkout -f
    Thanks for making a sub!

言われたとおり、コマンドを実行

    $ rm -rf .git
    $ git init
    $ git add .
    $ git commit -m 'Starting off foo'
    $ ./bin/foo init
    # 以下のメッセージが表示される。パスは作業ディレクトリに応じて変わる。

    # Load browse automatically by adding
    # the following to ~/.zshenv:
    
    eval "$(/XXXXXXXX/browse/bin/browse init -)"

最後に表示されるコマンドを実行することにより、補完が有効になる(XXXXXXXX は作業ディレクトリに応じて変わる)。`browse he[tab]` を実行してみよう。

    $ browse help
    Usage: browse <command> [<args>]
    Some useful browse commands are:
       commands               List all browse commands
    
    See 'browse help <command>' for information on a specific command.

無事ヘルプが表示されたら、セットアップはうまくいっている。

### サブコマンド作成

まずはディレクトリ構造を見てみよう。

    $ gfind ! -path './.git/*'
    .
    ./.git
    ./bin
    ./bin/browse
    ./completions
    ./completions/browse.bash
    ./completions/browse.zsh
    ./libexec
    ./libexec/browse
    ./libexec/browse-commands
    ./libexec/browse-completions
    ./libexec/browse-help
    ./libexec/browse-init
    ./libexec/browse-sh-shell
    ./LICENSE
    ./share
    ./share/browse
    ./share/browse/example

libexec/browse-SUBCOMMAND  形式でファイルを作れば、サブコマンドを追加できる。早速追加してみよう。

    $ vim libexec/browse-safari
    
        #!/usr/bin/env bash
        set -e
        open -a safari $1
        
    $ chomod a+x libexec/browse-safari

サブコマンドはシェル補完できるので、`browse saf[tab] http://google.com` といった入力が可能。問題が無ければブラウザが起動する。 ただ、これだけだと使い方がわかりづらいので、ヘルプを追加してみる。

    $ vim libexec/browse-safari
    
        #!/usr/bin/env bash
        #
        # Usage: browse safari [URL]
        # Summary: safari で指定の URL を開く
        # Help: safari を利用して、引数で渡された URL を開く
        # 何も URL を指定しなければ、ブラウザの起動のみ
        
        set -e
        
        open -a safari $1


ヘルプに反映されていることを確認。

    $ browse help safari
    Usage: browse safari [URL]

    safari を利用して、引数で渡された URL を開く
    何も URL を指定しなければ、ブラウザの起動のみ

引数なしの `help` もメッセージが変わっている。

    $ browse help
    Usage: browse <command> [<args>]
    
    Some useful browse commands are:
       commands               List all browse commands
       safari                 safari で指定の URL を開く
    
    See 'browse help <command>' for information on a specific command.

あとは、libexec-chrome, libexec-opera, ... とサブコマンドを追加していくことができる。

## 雑感

プログラムを書いてもシェルの補完設定までは手が回らないことが多いので、簡単にサポートしてくれる仕組みが提供されているのはかなりよかった。

シェルスクリプトの書き方はかなりばらつきがあり、自分の周りでも割とフリーダムな状況になっていたので、邪魔にならない程度のフレームワークがあればいいな、と思っていた。そういう用途にも合っていると思う。

## 参考

- [37signalsのブログでの紹介][blog]
- [GitHubのリポジトリ][sub]

[blog]: http://37signals.com/svn/posts/3264-automating-with-convention-introducing-sub
[sub]: https://github.com/37signals/sub
[37signals]: http://37signals.com/
