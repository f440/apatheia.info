---
layout: layouts/post.liquid
permalink: /blog/2013/04/06/about-ansible/
title: "構成管理ツール Ansible について"
created_at: 2013-04-06 14:50:00 +9:00
kind: article
comments: true
tags:
  - cm
---

[Ansible] というサーバーの設定を管理するツールの説明。いわゆる構成管理 (CM: Configuration Management) にカテゴライズされるもので、Puppet や Chef の親戚みたいなものと考えてもらえればだいたいあってる。

<!-- more -->

## 概要

リード開発者は Michael DeHaan で、現職の AnsibleWorks の前は Redhat で [Cobbler] や [Func] に携わっていたり、Puppet labs でプロダクトマネージャーしたりしているという経歴の持ち主。

Ansible は Python で書かれている。同じジャンルで Python 製というと [Salt] が有名。Chef の場合、レシピを書くためには Ruby の知識が必要となってくるけど、Ansible はどんな言語でもモジュールが書けるようになっているので、運用にあたって Python の知識は必要無い。

動作の点でも Puppet や Chef などのツールとまったく異なるアプローチをしている。Puppet や Chef は、サーバーとクライアントで構成され、クライアントとなるマシンはサーバーに設定を問い合わせながら、自分自身を「あるべき状態」に収束するよう変更を加えていく。Ansible の場合、サーバー側からクライアントとなるサーバー(群)に対して直接命令を送り込み結果を得る。これは [Func]、[Capistrano]、[Fabric] などに似ているが、これらのデプロイを目的としたツールにはない「何回やっても結果が同じ」(idempotence) という CM ツールらしさはちゃんと備えている。

ドキュメントは12ページしかなく(ちなみに、さっき数えてみたらChefのドキュメントは2834ファイルあった) 非常に習得は簡単。サーバーを立てる必要もなく、クライアントマシンもエージェントレス、加えて短期間で学習できるので手軽感は非常に高いが、モジュール機構が強力なのできわめて実用的になっている。



## 基本的な概念

Ansible を理解する上で重要となる、モジュールとプレーブックについて説明する。

### モジュール

クライアント内での動きはモジュールという形で定義する。

パッケージのインストール、サービスの起動、ユーザーやグループの作成などの基本的なモジュールはあるが、実際には環境に合わせて不足分は自分でモジュールを作っていくことになる。

モジュールは簡単に作れる。モジュールが役割を端的に言うと、以下を行うだけである。

- 標準入力でオプションを受け取る
- 標準出力で実行結果を返す

  - 出力形式は key=value を空白でつなげたものか JSON

これができる言語であれば、シェルスクリプトでも Perl でも問題ない。

### プレーブック

実際の処理では単発のモジュールでサーバーの設定が終わることはないので、モジュールの使い方をまとめたものが必要になる。Ansible では、YAML で処理をまとめたものを プレーブック (Playbook)と呼んでいる。

例: Apache と PHP をインストールする (webapp.yml)

    - hosts: webserver
      user: vagrant
      sudo: yes
      tasks:
        - name: install apache
          action: yum pkg=httpd state=installed
        - name: install php
          action: yum pkg=php state=installed

例: 実行

    # ansible-playbook プレーブック名
    $ ansible-playbook webapp.yml

以上は簡単な例だが、設定ファイルを配置したり、それに併せてサービスを再起動させたりといったことも記述可能。

プレーブックには以下のような内容が含まれる:

- hosts: 対象のホスト
- user: 実行ユーザー
- vars: 変数
- tasks: タスク

`vars` の変数は、テンプレート内で展開される。設定ファイル配置時にパラメータを変更、といった場合に利用する。

### インストール

以下では、インストールから簡単なコマンドの実行までの例を挙げる。サーバー、クライアント双方で CentOS 6.4 を利用した。

Ansible を動かすためには、Python 2.6 以上と Ansible のソースコードとごくわずかな Python パッケージだけあればよい。CentOS 6 であれば Python の条件は満たせているし、EPEL で Ansible のパッケージが提供されているので、`yum` でインストール可能。

    # EPEL 有効化
    $ sudo rpm -ivh http://ftp.riken.jp/Linux/fedora/epel/6/i386/epel-release-6-8.noarch.rpm

    # Ansible インストール
    $ sudo yum install ansible

他の Unix 系OSであれば、`pip install ansible` でいい。

    $ sudo pip install ansible

次に、サーバーからクライアントに SSH でログインできるように調整しておく。

    # 以下のマシンを用意した。
    # それぞれホスト名でアクセスできる
    #    Ansible 実行側 ... server
    #    変更対象 ... client1, client2

    # server側で公開鍵認証用の鍵を作成
    $ $ ssh-keygen -t rsa

    # client に公開鍵を配置する
    $ ssh-copy-id client1
    $ ssh-copy-id client2

    # 試しにログインしてみる
    # 頻繁に実行することになるので、公開鍵にパスフレーズを
    # 設定している場合は、ssh-agent を使ってパスフレーズの
    # 入力を省略できるようにしておく。
    $ ssh client1
    $ ssh client2

今度は、対象のサーバーを設定してみよう。環境変数 `ANSIBLE_HOSTS` にあるファイルでサーバーの指定が可能。

    $ cat <EOD >~/target
    > [webserver]
    > client1
    > 
    > [dbserver]
    > client2
    > EOD
    $ export ANSIBLE_HOSTS=~/target

設定の中で、`[ ]` によりグループを作っている。つまり「webserver グループに client1、dbserver グループに client2 が所属している」ということを表している。グループはオプションなので、単純にホスト名を羅列するだけでもいい。試しに、対象のホストを調べてみよう。

    # ansible ホストパターン --list-hosts

    # ホスト名を直接指定
    $ ansible client1 --list-hosts
    client1

    # グループ名を指定
    $ ansible webserver --list-hosts
    client1
    $ ansible dbserver --list-hosts
    client2

    # all を指定した場合、全サーバーを列挙
    $ ansible all --list-hosts
    client1
    client2

これだけで準備は完了。実行してみる。

    # コマンドの書式
    ansible 対象 -m モジュール名 -a オプション

    # 例 ping モジュール
    $ ansible all -m ping
    client2 | success >> {
        "changed": false,
        "ping": "pong"
    }
    
    client1 | success >> {
        "changed": false,
        "ping": "pong"
    }

`-m` をつけないで、直接コマンドを実行することも可能。

    # すべてのマシンでカーネルのバージョンを取得
    $ ansible all -a 'uname -r'
    client2 | success | rc=0 >>
    2.6.32-358.el6.x86_64
    
    client1 | success | rc=0 >>
    2.6.32-358.el6.x86_64

プレーブックを実行したときは以下のようになる。

    # 対象は webserver というグループ(client1 が所属)に対して、
    # Apache と PHP をインストールするプレーブック、webapp.yml を実行
    # Apache はすでにインストールされていたので、
    # PHP のみインストールされることとなった

    $ ansible-playbook webapp.yml
    
    PLAY [webserver] *********************
    
    GATHERING FACTS *********************
    ok: [client1]
    
    TASK: [install apache] *********************
    ok: [client1]
    
    TASK: [install php] *********************
    changed: [client1]
    
    PLAY RECAP *********************
    client1                        : ok=3    changed=1    unreachable=0    failed=0


## その他

- [Vagrant もバージョン 1.2 から Ansible でのプロビジョニングをサポート予定][vagrant ansible support]
- 開発は活発
- リリース名がヴァンヘイレンの曲名 (1.0 は Eruptionだった)
- ロゴがださい (ML でも 90年代のデザインなんて言われている)

## まとめ

ロゴのセンスは悪いけど、アプリケーション自体の仕組みはすごくセンスがいい。

他の構成管理ツールと比べると、DSL を覚えるといった「ツールを使うまでののコスト」、ツールのためのサーバー構築・運用といった「ツールを使ってからのコスト」が軽微なので、よりやりたいことに目が向けられるのもうれしい。

最近日本国内でも Chef の話題を聞くことが多いんだけど、Chef Server の運用とかオートスケールとのコンビネーションとかの情報はあまり聞かないので、たぶん割と小規模な環境でリモートサーバーの Chef-solo をキックみたいなケースが多いのかと思う。そういったところだと、Ansible のほうがふさわしいっていうことが多いんじゃないかな。

[Ansible]: http://ansible.cc/
[Github]: https://github.com/ansible
[Salt]: http://saltstack.com/
[Cobbler]: http://cobbler.github.io/
[Func]: https://fedorahosted.org/func/
[Fabric]: http://fabfile.org/
[Capistrano]: http://capistranorb.com/
[vagrant ansible support]: https://twitter.com/mitchellh/status/319914935910027264
[cooltext]: http://cooltext.com/
