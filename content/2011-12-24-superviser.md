---
layout: layouts/post.liquid
permalink: /blog/2011/12/24/superviser/
title: プロセス管理にsuperviserを使う
created_at: 2011-12-24 00:00:00 +09:00
kind: article
tags:
comments: true
published: true
---
ちょっと前にsupervisorを使ったのでやり方をまとめておく。

<!-- more -->

公式サイト: [supervisor](http://supervisord.org/)

supervisorはプログラムの起動、停止を管理するツール。daemontools
がわかるなら、あんな感じのソフトだと思ってもらえれば早い。daemontoolsよりも標準的なディレクトリ構成で使えるぶん、導入障壁は低いと思う。

最近のLinuxなら、パッケージですぐインストール出来る。以降の説明は debian (6.0.3)、superviser 3 系によるもの。

## インストール

    
    $ sudo apt-get install superviser
    

### 確認

    
    $ sudo service supervisor status # 起動確認（名前表示されない……）
     is running
    $ sudo service supervisor stop # 停止
    Stopping supervisor: supervisord.
    $ sudo service supervisor start # 起動
    Starting supervisor: supervisord.
    

## 例

例のために、自分のホームにインストールしてあったmemcachedを起動してみる。

まずは、コマンドラインから問題無く起動出来ることを確認

    
    $ /home/f440/opt/bin/memcached # 起動
    

プログラムはフォアグラウンドで起動する。memcached の例で言うと、-d オプション (run as a daemon) はつけない。

設定ファイルを配置する。もともと /etc/supervisor/supervisord.conf 内で /etc/supervisor/conf.d/\*.conf を Include するよう設定されていた読み込むように設定されていたので、以下のようなファイルを作った。

    
    $ cat /etc/supervisor/conf.d/memcached.conf
    [program:memcached]
    command=/home/f440/opt/bin/memcached
    user=f440
    

デフォルトだと設定したプログラムは自動起動する(autostart=true)なので、supervisor を再起動させれば memcachedも起動する。memcached がいつまでも起動しなければ /var/log/supervisor 以下のログを確認する。

何らかの原因で停止したとき、自動起動して欲しければ autorestart=true を指定しておく。

## コマンドで操作

起動中は supervisorctl 経由で操作ができるようになる。

    
    $ sudo supervisor 
    memcached                        RUNNING    pid 24928, uptime 0:08:21
    supervisor> # help でヘルプを表示
    supervisor> exit
    $ sudo supervisor status # 直接引数を渡すこともできる
    memcached                        RUNNING    pid 24928, uptime 0:08:21
    

## Webで操作

設定を追加するとWebから操作できるようになる。外部から好き放題できるので、安全な場所以外では適切な権限設定必須。

ポート9001で、どこからでもアクセスできるよう設定

    
    diff --git a/supervisor/supervisord.conf b/supervisor/supervisord.conf
    index 61b3020..86e04f2 100644
    --- a/supervisor/supervisord.conf
    +++ b/supervisor/supervisord.conf
    @@ -4,6 +4,9 @@
     file=/var/run//supervisor.sock   ; (the path to the socket file)
     chmod=0700                       ; sockef file mode (default 0700)
    
    +[inet_http_server]
    +port=*:9001
    +
     [supervisord]
     logfile=/var/log/supervisor/supervisord.log ; (main log file;default $CWD/supervisord.log)
     pidfile=/var/run/supervisord.pid ; (supervisord pidfile;default supervisord.pid)
    

設定ファイル再読込

    
     $ sudo supervisor reload
    

アクセス出来るようになる

![Web管理画面](/images/2011-12-24-superviser/tumblr_lx9eq9SHXa1qz5yk8.jpg)

終わり。

