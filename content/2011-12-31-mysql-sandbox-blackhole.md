---
layout: layouts/post.liquid
permalink: /blog/2011/12/31/mysql-sandbox-blackhole/
title: MySQL::Sandboxで環境を作ってBLACKHOLEエンジンを試す
created_at: 2011-12-31 00:00:00 +09:00
kind: article
tags:
  - mysql
comments: true
published: true
---
ちょっとMySQLのBLACKHOLEエンジン使って調べたいことがあったんだけど、
[MySQL::Sandbox](http://mysqlsandbox.net/) 使うとレプリケーション環境が簡単に構築できて便利。

<!-- more -->

以下は、MySQL::SandboxのセットアップからBLACKHOLEエンジン使うところまでの記録。

### 前提

  * 確認した環境は Debian 6.0.3, perl v5.12.3
  * cpanm & perlbrew インストール済み（`cpan`コマンドでも問題無いはず）
  * MySQL 5.5 はサーバーを起動するためにlibaio1が必要なので、あらかじめパッケージをインストールしておく

### 手順

#### インストール

`cpanm` でMySQL::Sandbox をインストール。

    
    $ cpanm MySQL::Sandbox
    

これで make_sandbox などのコマンド群がインストールされる。

データファイルは以下のようなファイル構成を取る

  * $HOME/opt/mysql 以下のサブディレクトリにサーバーを設置 (環境変数 SANDBOX_BINARY で変更可能)
  * $HOME/sandboxes 以下のサブディレクトリにMySQLのデータや起動スクリプトを設置 (環境変数 SANDBOX_HOME で変更可能)

#### サーバーセットアップ

サーバーを起動してみる。

    
    # 使用するディレクトリ設定
    $ export SANDBOX_BINARY=$HOME/opt/mysql
    $ export SANDBOX_HOME=$HOME/opt/sandboxes
    # ソース取得
    $ cd SANDBOX_HOME
    $ curl -L -o mysql-5.5.19-linux2.6-x86_64.tar.gz http://www-jp.mysql.com/get/Downloads/MySQL-5.5/mysql-5.5.19-linux2.6-x86_64.tar.gz/from/http://ftp.jaist.ac.jp/pub/mysql/
    # Sandbox 作成
    $ make_sandbox $SANDBOX_BINARY/mysql-5.5.19-linux2.6-x86_64.tar.gz
    

これで$SANDBOX_BINARY/5.5.19 にサーバーが、また $SANDBOX_HOME/msb_5_5_19 以下にインスタンスが作成される。

この時点で起動出来ているはずなので、接続してみる。以下で mysql クライアントが起動するはず。

    
    $ $SANDBOX_HOME/msb_5_5_19/use
    

`use`以外には、`start`, `stop`, `status` などの名前から動作が推測できそうなコマンド群がある。$SANDBOX_HOMEには複数のサンドボックスを操作するコマンド `use_all`, `start_all`, `stop_all` などがある。

    
    $ make_replication_sandbox 5.5.19 
    # 第二引数はtar.gzまでのパスでもいいが、一度展開されたらバージョン番号指定でもいい。make_sandboxも同様
    

以上で、 master, node1, node2 というサーバーが起動する。node1, node2 は masterを参照したレプリケーション構成となる。デフォルトでノードは2台だが、`--how_many_nodes` オプションで台数は変更可能。

同様に[Circular recplication](http://dev.mysql.com/doc/refman/5.1/ja/replication-
topology-circular.html)(日本語訳だとなんになるんだろう)も簡単に作れる。マスター/マスターレプリケーションはCircular replication が2台のみの構成だった場合に同じ。

    
    $ make_replication_sandbox --circular=4 5.5.19
    

これで node1 -> node2, node2 -> nod3, node3 -> node4, node4 -> node1 という循環関係のレプリケーションが作れる。

使い終わったら止めておこう。

    
    $ $SANDBOX_HOME/stop_all
    

### BLACKHOLEエンジンを試す

準備ができたので、[BLACKHOLEエンジン](http://dev.mysql.com/doc/refman/5.1/ja/blackhole-storage-engine.html)を使ってみる。BLACKHOLEエンジンはバイナリログは記録するが、データは残さないストレージエンジンのこと。

まずは、サンドボックス作成

$ make_replication_sandbox --circular=3 5.5.19

デフォルトストレージエンジンをnode1, node3はInnoDB、node2 はBLACKHOLEに変更

    
    $ echo default_storage_engine=InnoDB >> $SANDBOX_HOME/rcsandbox_5_5_19/node1/my.sandbox.cnf
    $ echo default_storage_engine=BLACKHOLE >> $SANDBOX_HOME/rcsandbox_5_5_19/node2/my.sandbox.cnf
    $ echo default_storage_engine=InnoDB >> $SANDBOX_HOME/rcsandbox_5_5_19/node3/my.sandbox.cnf
    $ $SANDBOX_HOME/rcsandbox_5_5_19/restart_all
    

node2, node3 のレプリケーションだけ再開して、node1 -> node2 -> node3 の2階層スレーブにする。

    
    $ $SANDBOX_HOME/rcsandbox_5_5_19/node2/use -e start slave
    $ $SANDBOX_HOME/rcsandbox_5_5_19/node3/use -e start slave
    

実験のための構成が完成した。ここで、node1 にデータを流し込んだとき、node2 にはデータが残らなくて、node3 にデータが出来たら成功。

サンプルデータには、[Sample database with test suite](https://launchpad.net/test-
db/)を利用する。

    
    $ curl -LO [http://launchpad.net/test-db/employees-db-1/1.0.6/+download/employees_db-full-1.0.6.tar.bz2](http://launchpad.net/test-db/employees-db-1/1.0.6/+download/employees_db-full-1.0.6.tar.bz2)
    $ tar xf employees_db-full-1.0.6.tar.bz2
    $ cd employees_db
    # InnoDB が決めうちで設定されているので、コメントアウト
    $ sed -i -re s/^\s+(set storage_engine = InnoDB;)/-- \1/ *.sql
    # 取り込み
    $ $SANDBOX_HOME/rcsandbox_5_5_19/node1/use  -t < ./employees.sql
    

結果

    
    $ cd $SANDBOX_HOME
    $ du -sh rcsandbox_5_5_19/node?/data/ibdata1
    219M    rcsandbox_5_5_19/node1/data/ibdata1
    18M     rcsandbox_5_5_19/node2/data/ibdata1
    219M    rcsandbox_5_5_19/node3/data/ibdata1
    

node2 だけデータファイルがふくらまない。

    
    $ ls -l rcsandbox_5_5_19/node2/data/
    合計 357652
    drwx------ 2 f440 f440      4096 2011-12-31 17:15 employees/
    -rw-rw---- 1 f440 f440   5242880 2011-12-31 17:14 ib_logfile0
    -rw-rw---- 1 f440 f440   5242880 2011-12-31 17:11 ib_logfile1
    -rw-rw---- 1 f440 f440  18874368 2011-12-31 17:14 ibdata1
    -rw-rw---- 1 f440 f440        88 2011-12-31 17:16 master.info
    -rw-rw---- 1 f440 f440      5925 2011-12-31 17:14 msandbox.err
    drwx------ 2 f440 f440      4096 2011-12-31 17:11 mysql/
    -rw-rw---- 1 f440 f440      6273 2011-12-31 17:14 mysql-bin.000001
    -rw-rw---- 1 f440 f440 168403385 2011-12-31 17:16 mysql-bin.000002
    -rw-rw---- 1 f440 f440        38 2011-12-31 17:14 mysql-bin.index
    -rw-rw---- 1 f440 f440       315 2011-12-31 17:14 mysql_sandbox15902-relay-bin.000005
    -rw-rw---- 1 f440 f440 168399499 2011-12-31 17:16 mysql_sandbox15902-relay-bin.000006
    -rw-rw---- 1 f440 f440        76 2011-12-31 17:14 mysql_sandbox15902-relay-bin.index
    -rw-rw---- 1 f440 f440         5 2011-12-31 17:14 mysql_sandbox15902.pid
    drwx------ 2 f440 f440      4096 2011-12-31 17:11 performance_schema/
    -rw-rw---- 1 f440 f440        75 2011-12-31 17:16 relay-log.info
    drwx------ 2 f440 f440      4096 2011-12-31 17:11 test/
    

node2 のバイナリログ、リレーログはちゃんと出来ているので、BLACKHOLEエンジンの適用を確認できた。

### メモ

  * `$SANDBOX_HOME/clear_all` でデータ消せるの便利。
  * MySQL::Sandbox 3.0.19 からは、[Percona や Maria DB などの派生DBも扱える](http://mysqlsandbox.net/news.html)みたい。いろいろなバージョンで試すことが多いのでうれしい。

