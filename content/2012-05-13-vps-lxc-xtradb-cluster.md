---
layout: layouts/post.liquid
permalink: /blog/2012/05/13/vps-lxc-xtradb-cluster/
title: さくらのVPSにLXCで仮想環境構築してXtraDB Cluster動かす
created_at: 2012-05-13 00:00:00 +09:00
kind: article
tags:
  - mysql
  - lxc
  - linux
comments: true
published: true
---
ほんの数年前までVPSといえばLinode、Slicehostなどの海外のサーバーしか選択肢がなかった。ls を実行しても一呼吸おくほどのレイテンシーがあるような環境で、128MBくらいのメモリを何とかやりくりしてRailsを動かしていたが、現在では月1000円程度で用途によっては手に余るようなスペックが手に入るようになっている。そんなVPSの余ったリソースを使って、仮想環境をたてようというのが今回の目的だ。

<!-- more -->

[LXC](http://lxc.sourceforge.net/)は、他の仮想化方式と比べてオーバーヘッドが少なくきびきび動くし、必要であればCPUやメモリの制限をつけることもできる。RPMやDebのパッケージ作成をしたり、Chefのcookbook作成などで独立した環境を手軽に構築したい人には特に有用に思う。また、簡単にネットワークが作れるので、複数台構成のソフトウェアを1台のマシンのなかで動かすことが出来る。今回は動作確認として [PerconaXtraDB Cluster](http://www.percona.com/software/percona-xtradb-cluster/)を動かしてみることにする。

## 前提について

作業環境は以下を想定している。

  * さくらのVPS(v3) 1G 
    * CentOS 6.2 x86_64
  * LXC 0.7.5

CentOSを使っているのはデフォルトのOSイメージだからというのが理由。

今回の内容をEC2上で実行する場合、Amazon Linux でもほとんど同様の設定で作業を行えることを確認しているけど、もっ と新しいOS、たとえば Ubuntu 12.04 LTS を使えば後述する cgroupの設定、bridgeの設定が不要となるためより簡単に行える。CentOS 6で実施したときだけ遭遇するような問題に何度もぶつかったので、出来るだけ新しいOSを使った方がいい。

仮想環境としては、lxcに同梱されているテンプレートを利用してUbuntuを、またOSイメージの作成からCentOSを構築する。

## 構築方法

以降の作業はすべて root で行うものとする。

### ネットワークの設定

仮想環境とのやりとりで使うブリッジを作る。

    
    # yum install bridge-utils
    # vim /etc/sysconfig/network-scripts/ifcfg-lxcbr0
    
        DEVICE=lxcbr0
        TYPE=Bridge
        BOOTPROTO=none
        IPADDR=10.0.3.1
        NETMASK=255.255.255.0
        ONBOOT=yes
    
    # ifup lxcbr0 # 起動
    

### cgroup

    
    # mount | grep cgroup # cgroup がないこと確認
    # mkdir -p /cgroup
    # printf "none			/cgroup		cgroup	defaults		0 0
    " >> /etc/fstab
    # mount -a
    # mount | grep cgroup # cgroup があること確認
    

### lxc セットアップ

    
    # yum install libcap-devel docbook-utils
    # yum groupinstall "Development Tools"
    
    # wget [http://lxc.sourceforge.net/download/lxc/lxc-0.7.5.tar.gz](http://lxc.sourceforge.net/download/lxc/lxc-0.7.5.tar.gz)
    # tar xf lxc-0.7.5.tar.gz
    # cd lxc-0.7.5
    # ./configure
    # make rpm # この途中で /usr/lib64/lxc/{template,rootfs} がインストールされるのかなり狂ってる
    # rpm -ivh ~/rpmbuild/RPMS/x86_64/lxc-0.7.5-1.x86_64.rpm
       (~/rpmbuild になければ、/usr/src/rpm から探す)
    # mkdir -p /var/lib/lxc
    

### dnsmasq (DHCP, DNS サーバー) セットアップ

環境を増やすごとに毎回NICの設定を編集するのは手間なので、ホスト側で dncp, dns の設定をする。

    
    # yum install dnsmasq
    # vim /etc/dnsmasq.conf
    
        コメントを外して有効化する、編集するなどで以下の設定を行う
        domain は自分の使いたい名前にすればいい
    
        domain-needed
        bogus-priv
        interface = lxcbr0
        listen-address = 127.0.0.1
        listen-address = 10.0.3.1
        expand-hosts
        domain = lxc
        dhcp-range = 10.0.3.50,10.0.3.200,1h
    
    # service dnsmasq reload
    

### ネットワークセットアップ

仮想環境から外部へのやりとりが出来るようにネットワークの設定を変更する。

    
    # sysctl -w net.ipv4.ip_forward=1
    # sed -i -re s/net.ipv4.ip_forward = 0/net.ipv4.ip_forward = 1/ /etc/sysctl.conf
    # iptables -A POSTROUTING -s 10.0.3.0/24 -t nat -j MASQUERADE
    # service iptables save # 設定を /etc/sysconfig/iptables に保存
    

### 仮想環境構築 (1) 同梱のスクリプトを使った Ubuntu のインストール

lxcに同梱のスクリプト /usr/lib64/lxc/templates/lxc-ubuntu を使ってUbuntuをインストールする。

基本的な設定ファイルを作る。

    
    # cd
    # vim lxc.conf
    
        lxc.network.type=veth
        lxc.network.link=lxcbr0
        lxc.network.flags=up
    

今回は Ubuntu を導入するので、そのために必要なプログラムをインストールする。

    
    # yum install --enablerepo=epel debootstrap dpkg
    

これで準備が出来たので、実際に仮想環境を動かしてみる。

    
    # lxc-create -t ubuntu -f lxc.conf -n vm0
       -t がテンプレートの名前。 -t ubuntu なら /usr/lib64/lxc/templates/lxc-ubuntu が読み込まれる
          オプションでバージョンが指定可能だが、lxc 0.7.5 に同梱されているテンプレートのデフォルトだと Ubuntu 10.04 が選ばれる。
       -f がさっき作った設定ファイルの場所
       -n が環境の名前。今回は vm0 とした。 /var/lib/lxc/vm0 にファイルがおかれる
    # lxc-start -n vm0 -l debug -o debug.out -d
       -l はデバッグレベル、-o はデバッグの場所を指定。安定して起動するようになったらつけなくていい
    # lxc-console -n vm0
      一回エンター押した後、ユーザー root パスワード root でログイン
      抜けるときは Ctrl-a q
    
      lxc-console をしても何も表示されない状態になったら、以下を施して再起動
    
    # vim /var/lib/lxc/vm0/rootfs/etc/init/lxc.conf
    
      telinit を差し込む
    
        --- /var/lib/lxc/vm0/rootfs/etc/init/lxcguest.conf.orig 2012-02-07 10:28:25.000000000 +0900
        +++ /var/lib/lxc/vm0/rootfs/etc/init/lxcguest.conf      2012-05-06 22:43:21.606098530 +0900
        @@ -12,5 +12,6 @@
            touch /var/run/utmp
            chown root:utmp /var/run/utmp
            initctl emit --no-wait net-device-added INTERFACE=lo || true
        +   telinit 3
            exit 0
         end script
    

lxc-console だとCtrl-aが使えなくて不便なので、今後はsshでログインしたい。テンプレートが自動的にOpenSSHをインストールしてくれるが、ちゃんと起動しない。仕方が無いので、update-rc.d で起動するように設定

    
      仮想環境内で実行
    # update-rc.d ssh enable
    

固定IPアドレスを振りたい場合は、設定を変更する。

    
      ホスト側からの変更
    # vim /var/lib/lxc/vm0/config
    
      lxc.network.ipv4 = 10.0.3.2/24
    
      仮想環境の中で変更
    # vim /etc/network/interfaces
    
        変更前
        auto lo
        iface lo inet loopback
    
        auto eth0
        iface eth0 inet dhcp
    
        変更後
        auto lo
        iface lo inet loopback
    
        iface eth0 inet static
            address 10.0.3.2
            netmask 255.255.255.0
            gateway 10.0.3.1
    

仮想環境の破棄は lxc-destroy で行う

    
    # lxc-destroy -n vm0
    

### 仮想環境構築 (2) 独自に構築した CentOS 6 のインストール

lxc-console の標準テンプレートでは CentOS が用意されていないので、自力でセットアップする。

#### イメージ作成

基本的に [Centos6/Installation/Minimal installation using yum](http://wiki.1tux.org/wiki/Centos6/Installation/Minimal_installation_using_yum) の通り。ただし 64 bit 版をインストールする

    
    # mkdir /t
    # cd /t
    # wget [http://mirrors.kernel.org/centos/6/os/x86_64/Packages/centos-release-6-2.el6.centos.7.x86_64.rpm](http://mirrors.kernel.org/centos/6/os/x86_64/Packages/centos-release-6-2.el6.centos.7.x86_64.rpm)
    # rpm2cpio centos-release-6-2.el6.centos.7.x86_64.rpm  | cpio -idm
    # sed -i s/$releasever/6/g ./etc/yum.repos.d/*
    # yum --installroot=/t groupinstall base
    # yum --installroot=/t install dhclient
    # rm centos-release*.rpm
    # chroot /t
    
      // ここから後はchroot内
    
    # passwd # パスワード変更
    
    # rm -f /dev/null
    # mknod -m 666 /dev/null c 1 3
    # mknod -m 666 /dev/zero c 1 5
    # mknod -m 666 /dev/urandom c 1 9
    # ln -s /dev/urandom /dev/random
    # mknod -m 600 /dev/console c 5 1
    # mknod -m 660 /dev/tty1 c 4 1
    # chown root:tty /dev/tty1
    
    # mkdir -p /dev/shm
    # chmod 1777 /dev/shm
    # mkdir -p /dev/pts
    # chmod 755 /dev/pts
    
    # cp -a /etc/skel/. /root/.
    
    # cat > /etc/resolv.conf << END
    # Google public DNS
    nameserver 8.8.8.8
    nameserver 8.8.4.4
    END
    
    # cat > /etc/hosts << END
    127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
    ::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
    END
    
    # cat > /etc/sysconfig/network << END
    NETWORKING=yes
    HOSTNAME=localhost
    END
    
    # cat > /etc/sysconfig/network-scripts/ifcfg-eth0  << END
    DEVICE=eth0
    ONBOOT=yes
    BOOTPROTO=dhcp
    END
    
    # cat > /etc/fstab << END
    /dev/root               /                       rootfs   defaults        0 0
    none                    /dev/shm                tmpfs    nosuid,nodev    0 0
    END
    
    # cat > /etc/init/lxc-sysinit.conf << END
    start on startup
    env container
    
    pre-start script
            if [ "x$container" != "xlxc" -a "x$container" != "xlibvirt" ]; then
                    stop;
            fi
            telinit 3
            initctl start tty TTY=console
            exit 0;
    end script
    END
    
    # exit
    
    // ここから後はchroot外
    
    # cd /t
    # tar cvfz /centos6-lxc-root.tgz .
    

#### 設定

    
    # mkdir /var/lib/lxc/vm0
    # cd /var/lib/lxc/vm0
    # mkdir rootfs
    # cd rootfs
    # tar xfz /centos6-lxc-root.tgz --numeric-owner
    # cd /var/lib/lxc/vm0
    
    # cat >/var/lib/lxc/vm0/config << END
    lxc.network.type=veth
    lxc.network.link=lxcbr0
    lxc.network.flags=up
    lxc.network.veth.pair=veth-vm0
    lxc.utsname = vm0
    
    lxc.tty = 1
    lxc.pts = 1024
    lxc.rootfs = /var/lib/lxc/vm0/rootfs
    lxc.mount  = /var/lib/lxc/vm0/fstab
    lxc.arch = x86_64
    lxc.cap.drop = sys_module mac_admin
    
    lxc.cgroup.devices.deny = a
    # Allow any mknod (but not using the node)
    lxc.cgroup.devices.allow = c *:* m
    lxc.cgroup.devices.allow = b *:* m
    # /dev/null and zero
    lxc.cgroup.devices.allow = c 1:3 rwm
    lxc.cgroup.devices.allow = c 1:5 rwm
    # consoles
    lxc.cgroup.devices.allow = c 5:1 rwm
    lxc.cgroup.devices.allow = c 5:0 rwm
    # /dev/{,u}random
    lxc.cgroup.devices.allow = c 1:9 rwm
    lxc.cgroup.devices.allow = c 1:8 rwm
    lxc.cgroup.devices.allow = c 136:* rwm
    lxc.cgroup.devices.allow = c 5:2 rwm
    # rtc
    lxc.cgroup.devices.allow = c 254:0 rwm
    #fuse
    lxc.cgroup.devices.allow = c 10:229 rwm
    #tun
    lxc.cgroup.devices.allow = c 10:200 rwm
    #full
    lxc.cgroup.devices.allow = c 1:7 rwm
    #hpet
    lxc.cgroup.devices.allow = c 10:228 rwm
    #kvm
    lxc.cgroup.devices.allow = c 10:232 rwm
    END
    
    # cat > fstab  << END
    proc            /var/lib/lxc/vm0/rootfs/proc         proc    nodev,noexec,nosuid 0 0
    sysfs           /var/lib/lxc/vm0/rootfs/sys          sysfs defaults  0 0
    END
    

#### 起動

    
    # lxc-start -n vm0 -l debug -o debug.out -d
    # lxc-console -n vm0
    
    OpenSSH がなければ入れておく
    # yum install openssh-server
    # service sshd start
    

## 動作確認 (Percona XtraDB Cluster の稼働確認)

動作確認として Percona XtraDB Cluster を動かしてみる。

すでにこれまでの作業を通して vm0 としてCentOS 6がインストール済みとする。

### ホスト側設定

  * 構成 
    * ホスト, IPアドレス 10.0.3.1
    * 仮想0 vm0, IPアドレス 10.0.3.2
    * 仮想1 vm1, IPアドレス 10.0.3.3
    * 仮想2 vm2, IPアドレス 10.0.3.4

各仮想環境に簡単にアクセスできるように hosts を設定しておく。ホスト側に設定しておけば、dnsmasq のおかげで仮想側でも名前が引けるようになる。

    
    # vim /etc/hosts
        以下を追記
        10.0.3.2 vm0
        10.0.3.3 vm1
        10.0.3.4 vm2
    

### コピー元(vm0) 設定

    
    # ssh vm0
      ここからはvm0の中
    
      固定IPアドレスを設定
    # vim /var/lib/lxc/vm1/rootfs/etc/sysconfig/network-scripts/ifcfg-eth0
        DEVICE=eth0
        ONBOOT=yes
        BOOTPROTO=static
        IPADDR=10.0.3.3
        NETMASK=255.255.255.0
        GATEWAY=10.0.3.1
    
      XtraDB Cluster インストール
    # rpm -Uhv [http://repo.percona.com/testing/centos/6/os/noarch/percona-testing-0.0-1.noarch.rpm](http://repo.percona.com/testing/centos/6/os/noarch/percona-testing-0.0-1.noarch.rpm)
    # rpm -Uhv [http://www.percona.com/downloads/percona-release/percona-release-0.0-1.x86_64.rpm](http://www.percona.com/downloads/percona-release/percona-release-0.0-1.x86_64.rpm)
    # yum install Percona-XtraDB-Cluster-server Percona-XtraDB-Cluster-client
    # cat > /etc/my.cnf <<END
    [mysqld]
    binlog_format=ROW
    wsrep_provider=/usr/lib64/libgalera_smm.so
    wsrep_cluster_address=gcomm://
    wsrep_slave_threads=2
    wsrep_cluster_name=lxccluster
    wsrep_sst_method=rsync
    wsrep_node_name=node0
    innodb_locks_unsafe_for_binlog=1
    innodb_autoinc_lock_mode=2
    END
    
    # poweroff
    

### コピー、起動

    
    # lxc-clone -n vm1 -o vm0
      -n はこれから作る仮想環境の名前
      -o はコピー元の仮想環境の名前
    # lxc-clone -n vm1 -o vm0
    # vim /var/lib/lxc/vm1/config
      vm0をvm1に置換 (vm2ではvm2に置換)
      IPアドレスを10.0.3.2 -> 10.0.3.3 に変更 (vm2では 10.0.3.4に変更)
    # vim /var/lib/lxc/vm1/rootfs/etc/my.cnf
        wsrep_cluster_address=gcomm:// をwsrep_cluster_address=gcomm://10.0.3.2 に変更
        wsrep_node_name=node0 を wsrep_node_name=node1 に変更 (vm2ではnode2に変更)
    
      同様にvm0からvm2のコピーを実施
    

3つの環境が完成したら起動

    
    # lxc-start -n vm0 -l debug -o debug.0.out -d
    # lxc-start -n vm1 -l debug -o debug.1.out -d
    # lxc-start -n vm2 -l debug -o debug.2.out -d
    

### 動作確認

vm0 にログインして実行

    
    # mysql -u root
      データベース、テーブル作成
    mysql> create database t;
    mysql> use t;
    mysql> create table sample (
    id int not null primary key auto_increment,
    value int
    );
    
    データ投入
    mysql> insert into sample set value = 1;
    mysql> insert into sample set value = 1;
    mysql> insert into sample set value = 1;
    mysql> select * from sample;
    +----+-------+
    | id | value |
    +----+-------+
    |  2 |     1 |
    |  5 |     1 |
    |  8 |     1 |
    +----+-------+
    

IDがスキップしながらインサートされることがわかる。引き続き、他の環境でもデータを入れてみる。

vm1 にログインして実行

    
    mysql> use t;
    mysql> select * from sample;
    +----+-------+
    | id | value |
    +----+-------+
    |  2 |     1 |
    |  5 |     1 |
    |  8 |     1 |
    +----+-------+
    mysql> insert into sample set value =  1;
    mysql> insert into sample set value =  1;
    mysql> insert into sample set value =  1;
    mysql> select * from sample;
    +----+-------+
    | id | value |
    +----+-------+
    |  2 |     1 |
    |  5 |     1 |
    |  8 |     1 |
    |  9 |     1 |
    | 12 |     1 |
    | 15 |     1 |
    +----+-------+
    

同様のことがvm2でも起きる。

これにより、XtraDB Cluster の以下の動作が確認出来た。

  * すべてのサーバーで書き込みと参照がおこなえること
  * オートインクリメントがバッティングしないように、値が自動的にオフセットをつけて挿入されること

## メモ

### 外部から仮想環境へ直接アクセスしたい場合

たとえば、外部からポート10080でアクセスされたとき、仮想環境の 10.0.3.51 のポート 80 へ転送させたい場合は iptables
で以下のような設定をする。

    
    # vim /etc/syscofig/iptables
        -A POSTROUTING -s 10.0.3.0/24 -j MASQUERADE の下に以下を追加
        -A PREROUTING -i eth0 -p tcp --dport 10080 -j DNAT --to-destination 10.0.3.51:80
    # service iptables condrestart
    # iptables -L -t nat # NATテーブルから設定追加を確認
    

### 新しい Ubuntu を入れたい場合

元の手順だとlucid (10.04) がインストールされるが、たとえば oneiric (11.10) であれば以下でインストール可能。

    
    # cp -a /usr/share/debootstrap/scripts/lucid  /usr/share/debootstrap/scripts/oneiric
        lucid は /usr/share/debootstrap/scripts/gutsy のシンボリックリンクで、他のリリースも同様。とにかくファ イル名が参照できるようにシンボリックリンクをコピーしておけばいい。
    # lxc-create -t ubuntu -f lxc.conf -n vm0 -- --trim -r oneiric
        lxc-create ではなく -r はテンプレートへの引数
    

### 他の OS もインストールしてみたい場合

/usr/lib64/lxc/templates/ には lxc-busybox,lxc-debian,lxc-fedora,lxc-lenny,lxc-
opensuse,lxc-sshd,lxc-ubuntu の テンプレートがある。これ以外の環境が必要であれば、「lxc guset
OS名」とかで検索してみる。

## 参考

  * [http://www.activestate.com/blog/2011/10/virtualization-ec2-cloud-using-lxc](http://www.activestate.com/blog/2011/10/virtualization-ec2-cloud-using-lxc)
  * [http://wiki.debian.org/LXC](http://wiki.debian.org/LXC)
  * [https://help.ubuntu.com/12.04/serverguide/lxc.html](https://help.ubuntu.com/12.04/serverguide/lxc.html)
  * [http://www.lacerta.be/d7/content/lxc-installation-ubuntu-server-1104](http://www.lacerta.be/d7/content/lxc-installation-ubuntu-server-1104)
  * [http://wiki.1tux.org/wiki/Lxc/Installation/Guest/Centos/6](http://wiki.1tux.org/wiki/Lxc/Installation/Guest/Centos/6)
  * [http://www.percona.com/doc/percona-xtradb-cluster/index.html](http://www.percona.com/doc/percona-xtradb-cluster/index.html)

