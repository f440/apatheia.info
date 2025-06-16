---
layout: layouts/post.liquid
permalink: /blog/2013/02/08/create-chocolatey-package/
title: "chocolatey で Haskell Platform 用のパッケージを作る"
created_at: 2013-02-08 22:49:00 +9:00
kind: article
comments: true
tags:
  - windows
  - chocolatey
  - haskell
  - chef
---

[chocolatey] の仕組みに興味を持ったので、パッケージを作ってみる。

<!-- more -->

目標は「[Haskell Platform for Windows] からインストーラをダウンロードしてきてサイレントインストール」ができるパッケージを作って、[chocolatey] のリポジトリにパッケージを登録してみる。

## 作業

### パッケージ作成

[ドキュメント](https://github.com/chocolatey/chocolatey/wiki/CreatePackages)では [warmup] (プロジェクトのひな形を作ったり、そこで生成されたファイル内の文字列を置換したりするプログラム) を使ったやり方が説明されているけど、うまく動かなかったのでガリガリ手作業でやっていく。

前提として、chocolatey のインストール方法は済んでいるものとする。

まずはテンプレートを手に入れる。github から直接ファイルをダウンロードでもいいけど、今回の手順では clone してみよう。

    # git 入れてなければ インストール
    cinst git
    # パスを通すため、コマンドプロンプトから抜けて新しく立ち上げ直す

    cd %ChocolateyInstall%
    git clone https://github.com/chocolatey/chocolateytemplates.git
    cd chocolateytemplates\_templates

どこでもいいので、作業用にフォルダを作ってそこにテンプレートをコピーする。

    cd %USERPROFILE%
    mkdir my_templates
    cd my_templates
    xcopy %ChocolateyInstall%\chocolateytemplates\_templates\chocolatey HaskellPlatform /s /e /i

いよいよテンプレートの中身を作っていく。

    cd HaskellPlatform
    ren __NAME__.nuspec HaskellPlatform.nuspec 
    # HaskellPlatform.nuspec と tools/chocolateyInstall.ps1 を開いてプレースホルダを変更
    notepad HaskellPlatform.nuspec
    notepad tools/chocolateyInstall.ps1
    # HaskellPlatform は NSIS 製なので、
    # http://nsis.sourceforge.net/Docs/Chapter3.html#3.2 より、
    # サイレントインストールのためのコマンドラインオプションが /S をつければいい

編集後のファイルは以下の通り

- [HaskellPlatform.nuspec](https://github.com/f440/chocolatey-HaskellPlatform/blob/master/HaskellPlatform.nuspec)
- [tools/chocolatey-HaskellPlatform.ps1](https://github.com/f440/chocolatey-HaskellPlatform/blob/master/tools/chocolateyInstall.ps1)

パッケージングする。

    cpack

HaskellPlatform.{バージョン番号}.nupkg ができるはず。インストールしてみよう。

    cinst HaskellPlatform -source %cd%

うまくいけば、Haskell のサイレントインストールが始まる。

### パッケージ登録

[chocolatey] にパッケージを登録してみよう。パッケージの登録にはアカウントが必要。

登録方法は 2 種類。

1. アップロードフォームから \*.nupkg をアップロード
2. API キーを取得して、コマンドラインから push

1 は簡単すぎるので、2 を試す。事前に [chocolatey] のアカウント画面から API キーを取得しておこう。

    cinst nuget.commandline
    NuGet SetApiKey <your key here> -source http://chocolatey.org/
    cpush HaskellPlatform.{バージョン番号}.nupkg

登録が終われば、他のマシンから `cinst HaskellPlatform` でインストールできるようになる。

## まとめ

アンインストールの設定が用意されていない、といっただいぶ手抜きなものだけど簡単にできた。

[chocolatey] 公式の github アカウントでは [Chef 用の cookbook](https://github.com/chocolatey/chocolatey-cookbook) を配布している。chef を使って Windows マシンをセットアップするとなると、パッケージマネージャがなければ [chef-cookbooks/windows] (Windows向けのResource/Provider) を使ってインストール方法をちまちま指定していくことになるわけだけど、[chocolatey] 使えば処理が抽象化できてよさげ。

## 参考

- [chocolatey]
- [Haskell Platform for Windows]
- [chocolateyのgithubアカウント](https://github.com/chocolatey/)

[chocolatey]: http://chocolatey.org/
[Haskell Platform for Windows]: http://www.haskell.org/platform/windows.html
[warmup]: https://github.com/chucknorris/Warmup
[chef-cookbooks/windows]: https://github.com/opscode-cookbooks/windows
