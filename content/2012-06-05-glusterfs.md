---
layout: layouts/post.liquid
permalink: /blog/2012/06/05/glusterfs/
title: 分散ファイルシステム GlusterFS を使う
created_at: 2012-06-05 00:00:00 +09:00
kind: article
tags:
comments: true
published: true
---
Webアプリケーションを構築する上で、運用中に発生したファイルをローカルのファイルシステム上に保管すると、スケールを阻害するため好ましくないことが多い。

<!-- more -->

そのため、アプリケーションの設計の段階からCDNの利用したり、ファイルの管理だけ別のサービスに切り出したりすることを考慮すべきだけど、いろいろなしがらみのた
めにどうしてもファイルを複数台のサーバーで共有するようなシステム形態にせざるを得ないことが往々にしてある。

サーバー間のファイル共有のための方法として、[lsyncd](http://code.google.com/p/lsyncd/) や[DRBD](http://www.drbd.org/)を使ったり、NASを介したりするなど様々な方法があるけど、[GlusterFS](http://www.gluster.or
g/) がとても便利。特別な機器を必要とせず、すでにある環境に対して導入でき、信頼性とスケーラビリティのあるクラスタリングファイルシステムを手早く構築するこ
とができる。

GlusterFS を簡単に説明すると、以下のような特徴がある:

  * 分散型ファイルシステム 
    * SPOFになるような特殊ノードも必要ない
  * NFSやCIFSでマウント可能 
    * 先日発表された 3.3.0 で、HDFSとの互換性できてHadoopから処理できるようになったり、OpenStack Object Storage API互換の REST APIが提供されたりでいろいろ熱い感じになっている
  * ストライピングで性能を上げたり、レプリケーションで耐障害性をあげたりすることが可能

今回は仮想マシンで動作を検証するまでの流れをまとめる。

## 環境構築

作業環境として、Mac OS X Lion上のVirtualBoxを利用し、仮想マシンとしてはCentOS 6.2
x86_64を使う。Windowsでやる場合は`vagrant ssh`が動かないので、そのあたりを読み替えればできると思う。

はじめにCentOS 6.2のマシンイメージを作る。

    
    $ gem install vagrant veewee
    $ mkdir work
    $ cd work
    $ vagrant basebox define CentOS-6.2-x86_64-minimal CentOS-6.2-x86_64-minimal
    $ vagrant basebox build CentOS-6.2-x86_64-minimal # マシンイメージのビルド
    $ vagrant basebox validate CentOS-6.2-x86_64-minimal # チェック
    $ vagrant basebox export CentOS-6.2-x86_64-minimal
    $ vagrant box add CentOS-6.2-x86_64-minimal CentOS-6.2-x86_64-minimal.box
    $ cd ..
    $ rm -rf ./work
    

次にクラスタ構成の設定。

    
    $ mkdir -p ~/Documents/vagrant/glusterfs/ # 作業用ディレクトリ作成
    $ cd ~/Documents/vagrant/glusterfs/
    $ vim Vagrantfile # 編集
    

[https://gist.github.com/2868494](https://gist.github.com/2868494)

    
    $ vagrant up # 3台の仮想マシン起動
    

必要となる仮想マシンがそろったので、glusterfsのセットアップを始める。

    
    $ cd ~/Documents/vagrant/glusterfs # この中は 共有ディレクトリを通して、仮想マシンの/vagrantからも参照可能
    $ curl -LO [http://download.gluster.org/pub/gluster/glusterfs/LATEST/CentOS/glusterfs-3.3.0-1.el6.x86_64.rpm](http://download.gluster.org/pub/gluster/glusterfs/LATEST/CentOS/glusterfs-3.3.0-1.el6.x86_64.rpm)
    $ curl -LO [http://download.gluster.org/pub/gluster/glusterfs/LATEST/CentOS/glusterfs-fuse-3.3.0-1.el6.x86_64.rpm](http://download.gluster.org/pub/gluster/glusterfs/LATEST/CentOS/glusterfs-fuse-3.3.0-1.el6.x86_64.rpm)
    $ curl -LO [http://download.gluster.org/pub/gluster/glusterfs/LATEST/CentOS/glusterfs-server-3.3.0-1.el6.x86_64.rpm](http://download.gluster.org/pub/gluster/glusterfs/LATEST/CentOS/glusterfs-server-3.3.0-1.el6.x86_64.rpm)
    

仮想マシンに必要となるパッケージをインストールしておく。

    
    $ brew install parallel # 一台ずつ設定するの面倒なので、gnu parallel 使う
    $ parallel vagrant ssh {} -c sh -c "sudo yum -y install wget fuse fuse-libs" ::: host1 host2 host3
    $ parallel vagrant ssh {} -c sh -c "sudo yum install -y /vagrant/glusterfs-*" ::: host1 host2 host3 # パッケージインストール
    $ parallel vagrant ssh {} -c sh -c "/usr/sbin/glusterfs -V" ::: host1 host2 host3 # 動作確認
    $ parallel vagrant ssh {} -c sh -c "sudo /sbin/service iptables stop" ::: host1 host2 host3 # iptables 停止
    $ parallel vagrant ssh {} -c sh -c "sudo /sbin/service glusterd start" ::: host1 host2 host3 # 起動
    

以降、`$` から始まるのはホストOS、`hostX$` から始まるのは仮想マシン上のターミナルの説明とする。

## ストレージプール作成

ストレージプールと呼ばれる、サーバー間の信頼済みネットワークを作成する。

    
    $ vagrant ssh host1
    
    host1$ sudo gluster peer probe 192.168.56.11 # host2 をプールに追加
    host1$ sudo gluster peer probe 192.168.56.12 # host3 をプールに追加
    # 自ホスト(host1)の追加は不要
    

## ボリューム作成

ストレージプールを構成したら、ボリュームを作成する。

ボリュームは「分散するかどうか」「レプリケーションするかどうか」「ストライピングするかどうか」を選ぶことになる。組み合わせることも可能。ひとまず2台構成で分
散、ストライピング、レプリケーションのそれぞれについて試してみる。

### 分散

ファイルをストレージ内のどこかしらに保存しておく形態。追加すればするほど大きなストレージとなるけど、冗長性などは確保されない。

host1, host2 で分散ボリュームを作ってみる。

    
    $ parallel vagrant ssh {} -c sh -c "sudo mkdir -p /export/vol" ::: host1 host2
    $ vagrant ssh host1
    
    host1$ sudo gluster volume create vol 192.168.56.10:/export/vol 192.168.56.11:/export/vol
    

### ストラインピング

性能向上を目的として、ファイルを複数に分割して保存しておく形態。RAID0みたいな感じ。

host2, host3 でストライピングボリュームを作ってみる。

    
    $ parallel vagrant ssh {} -c sh -c "sudo mkdir -p /export/vol-striping" ::: host2 host3  
    $ vagrant ssh host1
    
    host1 $ sudo gluster volume create vol-striping stripe 2 192.168.56.11:/export/vol-striping 192.168.56.12:/export/vol-striping
    

### レプリケーション

データの複製を作って、複数の場所に保管しておく形態。RAID1みたいな感じ。信頼性が高くなり、ファイルの読み込みも早くなる。

host1, host3 でレプリケーションボリュームを作ってみる。

    
    $ parallel vagrant ssh {} -c sh -c "sudo mkdir -p /export/vol-replica" ::: host1 host3
    $ vagrant ssh host1
    
    host1$ sudo gluster volume create vol-replica replica 2 192.168.56.10:/export/vol-replica 192.168.56.12:/export/vol-replica
    host1$ sudo gluster volume start vol-replica
    

## 利用

### マウント

OSにマウントしてみる。マウント方法にはNFSやCIFSなども選べるけど、ここではネイティブのglusterfs形式を選んでみる。

    
    $ vagrant ssh host1
    
    host1$ sudo mkdir -p /mnt/{vol,vol-striping,vol-replica}
    host1$ sudo mount -t glusterfs 192.168.56.10:/vol /mnt/vol # 分散
    host1$ sudo mount -t glusterfs 192.168.56.11:/vol-striping /mnt/vol-striping # ストライピング
    host1$ sudo mount -t glusterfs 192.168.56.12:/vol-replica /mnt/vol-replica # レプリケーション    
    

### 動作確認

はじめに、マウントした結果を見てみる。

    
    $ df -h /mnt/*
    Filesystem            Size  Used Avail Use% Mounted on
    192.168.56.10:vol      17G  1.9G   14G  12% /mnt/vol
    192.168.56.12:vol-replica
                          8.4G  949M  7.0G  12% /mnt/vol-replica
    192.168.56.11:vol-striping
                           17G  1.9G   14G  12% /mnt/vol-striping
    

分散、ストライピングは2台分を足し合わせた結果になっている。レプリケーションは2台に同じデータが分散されるので、ディスク効率は50%に下がる。

#### 分散

適当にファイルを作ってみる。

    
    host1$ sudo touch /mnt/vol/{1..9}
    
    # 保管先をチェック
    
    host1$ ls /export/vol/ # 1  5  7  8  9
    
    host2$ ls /export/vol/ # 2  3  4  6
    

ファイルがばらばらと格納されていることがわかる。

### ストライピング

    
    host1$ sudo vi /mnt/vol-striping/sample.txt # 10M強データをテキストデータを書き込み
    
    host1$ du -s /mnt/vol-striping/sample.txt # 10256と表示された
    host1$ ls -l /mnt/vol-striping/sample.txt # サイズが 10484785 と表示された
    
    # 保管先をチェック
    host2$ du -s /export/vol-striping/sample.txt # 5128 と表示された
    host2$ ls -l /export/vol-striping/sample.txt # サイズが 10354688 と表示された
    
    host3$ du -s /export/vol-striping/sample.txt # 5128 と表示された
    host3$ ls -l /export/vol-striping/sample.txt # サイズが 10484785 と表示された
    

duの結果（ディスクのセクタ）はちょうど半分ずつに分割されるけど、ファイルの実際のサイズは元ファイルと同じ場合と異なる場合の2パターンが検出できた。これは、
ファイルがスパースファイルなっているため、見かけ上のサイズと実際にディスク上で利用しているサイズが異なっていることが原因。

### レプリケーション

適当なファイルを作ってみる。

    
    host1$ sudo dd if=/dev/urandom of=/mnt/vol-replica/dummy bs=1M count=10
    host1$ sha1sum /mnt/vol-replica/dummy # 54b5c383e96d511249f9393de060c3219549e030 だった
    
    # 保管先をチェック
    host1$ sha1sum /export/vol-replica/dummy # 54b5c383e96d511249f9393de060c3219549e030 だった
    
    host2$ sha1sum /export/vol-replica/dummy # 54b5c383e96d511249f9393de060c3219549e030 だった
    

同じ内容のファイルが複数箇所に保存されることがわかった。

## メモ

なんとなくでも使い始められちゃうくらい簡単に使えるけど、[ドキュメント](http://gluster.org/community/documentatio
n/index.php/Main_Page)の[PDF](http://www.gluster.org/wp-
content/uploads/2012/05/Gluster_File_System-3.3.0-Administration_Guide-en-
US.pdf) がわかりやすくコンパクトにまとまっていて、全体像を理解するのはここからここから始めるといいと思う。

## 参考

  * [Gluster Community のドキュメント](http://www.gluster.org/community/documentation/index.php/Main_Page)

