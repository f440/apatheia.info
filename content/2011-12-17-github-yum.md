---
layout: layouts/post.liquid
permalink: /blog/2011/12/17/github-yum/
title: githubを使ってyumリポジトリを公開する
created_at: 2011-12-17 00:00:00 +09:00
kind: article
tags:
  - git
  - github
  - centos
  - rpm
  - yum
comments: true
published: true
---
ubuntuには[PPA](https://launchpad.net/ubuntu/+ppas)という仕組みがあり、プロジェクトホスティングサービス[launchpad](https://launchpad.net/) と連携してパッケージを簡単に配布する仕組みが用意されている。今回は、githubを使ってリポジトリにpushしたら自動的にRPMパッケージを公開する方法をまとめる。

<!-- more -->

※
PPAだとサーバサイドで各種プラットフォームにビルドしてくれるが、そこまではサポートしない。あくまで配布だけ。RPMをどうやって作るのかについても触れない。

以下は[haproxy](http://haproxy.1wt.eu/)
を公開するときの例。haproxyのソースにはRPMのspecファイルが含まれているので、簡単にrpmが作成出来る。

## 手順

### git リポジトリを作成

[Create a New Repository - github](https://github.com/repositories/new)
からリポジトリを作成。

### ディレクトリ構造を作成

以下はCentOS 5 64bit 版とソースRPMを配布する場合

    
    $ mkdir -p haproxy-rpm/centos/5/os/{SRPMS,x86_64}
    $ cd haproxy-rpm
    

### ファイル設置

    
    $ cp /some/path/haproxy-1.4.18-1.src.rpm centos/5/os/SRPMS/
    $ cp /some/path/haproxy-1.4.18-1.x86_64.rpm centos/5/os/x86_64/
    

### メタデータ作成

    
    $ sudo yum install -y createrepo
    $ createrepo centos/5/os/SRPMS/
    $ createrepo centos/5/os/x86_64/
    

### commit & push

    
    $ git add .
    $ git ci -m initial commit  
    $ git remote add origin git@github.com:f440/haproxy-rpm.git
    $ git push -u origin master
    

## 利用方法

/etc/yum.repos.d 以下にわかりやすい名前でファイルを作る。

    
    サンプル /etc/yum.repos.d/haproxy-rpm-f440.repo (1行目やnameは適宜変更する)
    
    [haproxy-rpm-f440]
    name=haproxy-CentOS-$releasever
    baseurl=https://raw.github.com/f440/haproxy-rpm/master/centos/5/os/x86_64/
    enabled=1
    gpgcheck=0
    

あとは通常通り `sudo yum install haproxy` でインストール可能。

## 備考

  * createrepo はdebian, ubuntuなどにもコマンドが用意されているので、ビルド以外の作業はRHEL系以外のOSでもよい
  * mercurialを使いたければ、[bitbucket](https://bitbucket.org)でも似たような手順で公開可能。その際は baseurl の部分に `baseurl=https://bitbucket.org/f440/haproxy-rpm/raw/tip/centos/$releasever/os/$basearch/` のような形式で記述する

