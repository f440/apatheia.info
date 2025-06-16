---
layout: layouts/post.liquid
permalink: /blog/2013/08/10/octopress-to-middleman/
title: "ブログエンジンを Octopress から Middleman に変えた"
created_at: 2013-08-10 20:30:00 +9:00
kind: article
comments: true
tags:
  - octopress
  - middleman
---

このサイトは今まで [Octopress] を使って生成していたんだけど、[Middleman] に変えてみた。

<!-- more -->

元々 Octopress の設定ファイルの書き方とかがモヤモヤするものがあって(Rakefile に設定項目埋め込んであるところとか) Jekyll にしようかなと思ったんだけど、なんとなく Middleman にしてみた。その後の感想など。

(もう2ヶ月くらい前の話なので、移行当時の記憶はおぼろげ)

- ビルド時間が短くなった
  - 素の jekyll はビルド早いんだけど、Octopress は結構遅いんで気になっていた。middleman は Octopress よりかは早い
- ブログの内容はほぼそのまま使い回せた
  - メタデータ部分を s/categories/tags/ で置換したくらいだったと思う
- 公開されているテンプレートが少ない
  - 自分でちまちま書いてる
- middleman-livereload が便利
  - [rack-livereload](https://github.com/johnbintz/rack-livereload) を使っている。ブラウザに拡張を入れなくても、Web Socket でリロードしてくれる。
- [tilt] を使っているので、テンプレートエンジンは自由に選択できる
  - 楽しくなって、[Slim](http://slim-lang.com/) を使って [shower](https://github.com/shower/shower) を [移植してみたりした](https://github.com/f440/middleman-miwer)。

おおむね満足です。

## 参考
- [Octopress][]
- [Middleman][]
- [tilt][]

[Octopress]: http://octopress.org/
[Middleman]: http://middlemanapp.com/
[tilt]: https://github.com/rtomayko/tilt
