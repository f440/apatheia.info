---
layout: layouts/post.liquid
permalink: /blog/2013/08/10/immutable-infrastructure/
title: "Immutable Infrastracture について"
created_at: 2013-08-10 21:00:00 +9:00
kind: article
comments: true
tags:
  - infrastructure
  - virtualization
  - aws
---

ここ最近話題に上がることが多い Immutable Infrastracture と、その他仮想環境周りについての雑感。

<!-- more -->

Immutable Server や Immutable Infrastracture っていう単語がいろんなところで目に入るようになった。とくに Chad Fowler が[ブログで取り上げたり](http://chadfowler.com/blog/2013/06/23/immutable-deployments/)、[Food Fight に出たり](http://foodfightshow.org/2013/07/immutable-infrastructure.html) して、世間でも関心が高まった感じがある。

プログラムを書く人にはご存じの通り、この Immutable っていうのは状態が変更出来ないことを指している。Immutable な Infrastracture っていうのは、ざっくり言うと「運用中のサーバーに変更を加えない」っていうアプローチでサーバーを管理しているスタイルのこと。

(ファイルシステムを読み取り専用にする、とかそういう話じゃなくて、あくまでそういう方針でやろうっていう話)

サーバーの設定を変更したくなったら、その変更を加えた新しいサーバーを用意する。アプリケーションをデプロイしたくなったら、新しくサーバーを立ち上げてそちらにデプロイを行う。稼働中のサーバーに SSH でログインして設定を変更するようなことはせず、なにかしらの変更のためにはつねにサーバーを追加していく。サービスを新サーバー群にで行うように DNS を切り替えたあと、参照されなくなったサーバーは破棄する(まるでガベージコレクションみたいだね)。


## どうやって Immutable Infrastracture を実現するのか

Immutable Infrastracture には、いわゆる [Blue Green Deployment](http://martinfowler.com/bliki/BlueGreenDeployment.html) で知られているテクニックを用いる。

現在、プラットフォームとして上手に Immutable Infrastracture を実現できているのは [AWS Elastic Beanstalk](http://aws.amazon.com/jp/elasticbeanstalk/) だと思っているので、これを例に説明する。Elastic Beanstalk を「あー、AWS がやってる heroku 的なアレだろ」くらいの認識しかなければ、一度ちゃんと調べてみたほうがいい。

Elastic Beanstalk では、ロードバランサーとそこにぶら下がるサーバー群 (オートスケールするので、台数は伸び縮みする) が「環境(Envirnment)」というくくりで管理される。

サーバーには Amazon が用意したマシンイメージを使うこともできるし、カスタマイズしたイメージを利用することも可能になっている。アプリケーションのデプロイは git push だったり、Java の war ファイルアップロードでできるので、サーバーにログインする必要はない。

「環境」にはそれぞれ URL が割り振られるのだが、これは環境間ですげ替えることができる。つまり、検証環境でアプリをデプロイしたりミドルウェアの設定変更をして、確認がとれたら本番環境と入れ替えたり、問題が起きたらすぐに元に戻したりといったことがダウンタイムなく行える。

Netflix のデプロイツール [asgard](https://github.com/Netflix/asgard) も同じようなことをしているし、Heroku の [preboot](https://devcenter.heroku.com/articles/labs-preboot/) も内部では同じようなことやってるんじゃないかな。(追記: Heroku の Preboot だけど、説明ページへのリンクがなくなっている。今は [Pipelines](https://devcenter.heroku.com/articles/labs-pipelines) 使えってことかも)

もちろん、オンプレミスに自前の環境でこういったことを行うことも可能だろうけど、アプリケーションの切り替えに DNS の設定変更なり浮動 IP アドレスの付け替えなりが必要となってくるので、かなり面倒くさい。すでにシステムとして提供されているものを利用できるのであれば、それを使うのが現実的だとは思う。


## 構成管理ツールの役割

設定を変更するためだけに新しいマシンを作るだなんて、なんでそんなことをするのだろうと Chef や Puppet などのツールを使って変更管理している人たちは不思議に思うかもしれない。発想を逆にしてみると、仮想マシンが状態を持っているから冪等性だとか自己修復性を考慮したセットアップツールが必要になる。仮想マシンが不変だという前提にたてば、こういった処理が省けるようになるのかもしれない。

とはいえ、Immutable Infrastracture を実践したとしても構成管理ツールは以下のような局面で今後も使われていくことになるだろうと思う。

- ベースとなる仮想マシンのセットアップのため
- 初回起動後の仮想マシンに対して、(仮想マシンに組み込めない or 組み込みたくない) マシンごとの変更を設定するため

個人的には、今の Chef や Puppet みたいなサーバー/クライアント構成は必要なくて、もっとライトウェイトなもので十分な気がしている。


## 仮想マシンの役割

昨今の構成管理ツールブームで、サーバーセットアップの技術が成熟してきた。こういったツールをソフトウェアでいうところの autotools や ant といったビルドツールにたとえるなら、次の興味は apt や rpm といったパッケージにあたるもの、つまりセットアップ済み仮想マシンになるかと思う。

- Packer は仮想マシンの作成手順や作成先を抽象化しようとしている
- Docker は仮想マシンをまるで Github から clone するかのように共有する方法を提供している
- AWS MarketPlace は個人/企業に仮想マシンを売り買いできる仕組みを提供している

最近のプロダクトやサービスを考えてみても、仮想マシン自体の取り扱いにだんだん関心がむかっているのは確かっぽい。Immutable Infrastracture もまた、仮想マシンを仮想マシンらしく扱った運用形態といえるんじゃないかな。


## 参考

- [ImmutableServer](http://martinfowler.com/bliki/ImmutableServer.html)
- [Rethinking building on the cloud: Part 4: Immutable Servers](http://www.thoughtworks-studios.com/blog/rethinking-building-cloud-part-4-immutable-servers)
- [Trash Your Servers and Burn Your Code: Immutable Infrastructure and Disposable Components - Chad Fowler](http://chadfowler.com/blog/2013/06/23/immutable-deployments/)
