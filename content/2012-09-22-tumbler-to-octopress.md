---
layout: layouts/post.liquid
permalink: /blog/2012/09/22/tumbler-to-octopress/
title: "TumblerからOctopressへの移行"
created_at: 2012-09-22 17:28:00 +9:00
kind: article
comments: true
tags:
  - octopress
---

Tumblerでブログ書いていたけど、ローカルで記事書く => フォームに貼り付け => プレビューのサイクルが結構面倒くさいな、と常々思っていたので、Octopressに移行した。

ホスティングには [Github Pages][] を利用している。

<!-- more -->

##  手順

### 設定

    $ git clone git://github.com/imathis/octopress.git octopress

    # テーマ入れ替える    
    $ git clone git://github.com/tommy351/Octopress-Theme-Slash.git .themes/slash
    $ rake 'install[slash]' # zsh だとクォートなりエスケープするなりしないと、[, ] がメタ文字として解釈される
    # .themes/slash/{source,sass} がルートディレクトリにコピーされる
    
このままだと header の canonical が設定されないかったので、同梱テンプレート `.themes/classic/source/_includes/head.html` を参考に `./source/_includes/head.html` をちょっとといじった。
    
### Tumbler の記事をインポート

[ブログの過去記事](http://tsurayogoshi.tumblr.com/archive)を全部インポートする
( 参考: [Goodbye Tumblr. Hello, Octopress Powered by Jekyll and Markdown!][] )

    
    $ wget -O source/tumblr.rb https://raw.github.com/stephenmcd/jekyll/master/lib/jekyll/migrators/tumblr.rb
    $ vim source/tumblr.rb # format="md" => format="markdown" に書き換え
    $ ruby -rubygems -e 'require "./source/tumblr"; Jekyll::Tumblr.process("http://tsurayogoshi.tumblr.com", format="markdown", grab_images=true)'
    $ mv _posts/tumblr/* source/_posts/
    $ mv post source/

後は細かい調整

- 画像のパスが tumblr を参照しているので、全部ダウンロードして `source/images`
  以下に保存
- 記事のメタデータ部分
  - `comments: true`を追加
  - `tags` を `categories` に書き換え。
- 各種外部サイト向けパーツの設定

`source/post` には、tumbler と同じURLでアクセスしたとき、移行後のコンテンツにアクセスするリダイレクト設定が入っている。tumbler の頃からカスタムドメインを使っていた場合は、後述のドメイン設定で前と同じドメインにすればいい。

### ドメインの設定

独自ドメインを使う場合、source/ 以下に CNAME というファイルを作り、そこにドメインを書いておく。その後、指定の IP アドレスに名前を向ける。

何度かIPアドレスが変更になっているみたいで、別のIPアドレスを利用した説明がネットに残っているけど、古いものだとカスタムドメインが使えるけどusername.github.comからのカスタムドメインへのリダイレクトが有効にならなかったりするので、ちゃんと
[公式の説明](https://help.github.com/articles/setting-up-a-custom-domain-with-pages)のもの
を参照すること。

### Github Pages へデプロイ

[ドキュメント](http://octopress.org/docs/deploying/github/)を読めばわかるので詳細は割愛。

`source` ディレクトリの中身が `public` 以下に展開されて、ここがプレビュー領域となる。`public` の中身が `_deploy` にコピーされて、ここが Github Pages に pushされる。

git リポジトリのうち `master` ブランチがは公開用、`source` が編集用となる。ルーディレクトリに `source` ブランチ、公開用の `_deploy` ディレクトリに `maste` ブランチという二つのリポジトリが配置されることになる。


## 感想

vim で書く => すぐに確認 => github にデプロイ => 公開の流れは気持ちいい。tumblr の頃と同じく、markdown で書けるのもとても具合がいい。

[Github Pages]: http://pages.github.com/
[Goodbye Tumblr. Hello, Octopress Powered by Jekyll and Markdown!]: http://blog.assimov.net/blog/2012/03/24/tumblr-to-octopress-powered-by-jekyll-and-markdown/

