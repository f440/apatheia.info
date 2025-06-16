---
layout: layouts/post.liquid
permalink: /blog/2012/01/03/rundeck-jenkins-java/
title: rundeckをセットアップして、jenkins上のjava成果物をデプロイする
created_at: 2012-01-03 00:00:00 +09:00
kind: article
tags:
comments: true
published: true
---
rundeck でjenkins上の成果物をデプロイしよう、という話。

<!-- more -->

## rundeck について

[公式サイト](http://rundeck.org/)

ITオペレーションのコンサルやってる[DTO Solution](http://www.dtosolutions.com/)（Depops関連の資料とかでよく会社名は見かけますね）が作っているデプロイ用のツール。元々は[ControlTier](http://doc36.controltier.org/wiki/Main_Page)っていう管理ツールがあって、そこから分家した。ControlTierはサーバー/クライアントモデルだけど、サーバー側しか用意しなくていいRundeckのほうがお手軽度高い。

複数のサーバーを対象に状態を変更するのが目的で、[capistrano](https://github.com/capistrano/capistrano)とか[fabric](http://docs.fabfile.org)とかと同じジャンル。GUIで操作するのが特徴なので、[webistrano](https://github.com/peritor/webistrano)
とかに近い。

GUI（笑）みたいに思うかもしれないけど、画面上から履歴が確認できたり、ブラウザがあればどこからでもデプロイ出来るのって、運用の敷居下げるのに貢献してくれると思う。

## rundeck 設定

### インストール

とりあえずインストールしてみる。以降の説明は、rundeck インストールサーバー、デプロイ対象サーバーともに CentOS 5 の場合。

[http://rundeck.org/docs/RunDeck-Guide.html#installing-rundeck](http://rundeck.org/docs/RunDeck-Guide.html#installing-rundeck) , [http://kb.dtosolutions.com/wiki/Rundeck_on_CentOS](http://kb.dtosolutions.com/wiki/Rundeck_on_CentOS) 参照。CentOSならyumで簡単にインストールできる。

    
    $ sudo rpm -Uvh [http://repo.rundeck.org/latest.rpm](http://repo.rundeck.org/latest.rpm)
    $ sudo yum install rundeck
    

まずはインストールされたファイルを確認してみよう。

    
    $ rpm -ql rundeck
    $ rpm -ql rundeck-config
    

以下のようなことがわかる。

  * 設定系のファイル /etc/rundeck は本体と別の RPM (rundeck-config) に入っている
  * /var/lib/rundeck 以下にシステム関係のデータがおかれて、/var/rundeck 以下にユーザーが作成したデータをおくっぽい
    * 僕は試してないけど、保存先はDBも使えるみたい。http://rundeck.org/docs/RunDeck-Guide.html#relational-database

### 起動

さっそく起動してみる。

    
    $ sudo /sbin/service rundeckd start
    

既定のポートは 4440 なので http://RUNDECK_HOST:4440/ にアクセスしてみる。

![ログイン画面](/images/2012-01-03-rundeckjenkinsjava/tumblr_lx82ozkABF1qz5yk8.png)

アクセスできなければ、ちゃんと起動出来てるかどうかとか、iptables が邪魔していないかとか確認。この時点ではまだログイン出来ない。

ログインできるようにするために、ユーザーを作る。[公式サイトの説明](http://rundeck.org/docs/RunDeck-Guide.html
#managing-logins)

パスワードのハッシュ化はmd5sumコマンドとかでもいいけど、手順に沿って付属のライブラリ使ってみる。RPMでインストールすると、説明文中の$RUNDECK_BASE相当がないので、読み替えて以下のように実行

    
    $ cd /var/lib/rundeck/
    $ java -cp exp/webapp/WEB-INF/lib/jetty-6.1.21.jar:exp/webapp/WEB-INF/lib/jetty-util-6.1.21.jar org.mortbay.jetty.security.Password f440 secret_password
    OBF:1vny1vn61unn1z7e1vu91ytc1r3x1xfj1r411yta1vv11z7o1uob1vnw1vn4
    MD5:be6cb1069f01cd207e6484538367bd1d
    CRYPT:f4Ou7EnVsEzMg
    

ユーザー一覧に追加

    
    $ sudo vim /etc/rundeck/realm.properties
    // 末尾に以下を追加
    f440: MD5:be6cb1069f01cd207e6484538367bd1d,admin,user
    

これで利用可能になった。ユーザー情報を読み込むために、サービス再起動 （今後もユーザー設定の変更ごとに再起動させる）

    
    $ sudo /sbin/service rundeckd restart
    

アクセス出来るようになったはず。ログインしてみる。

![ログイン直後](/images/2012-01-03-rundeckjenkinsjava/tumblr_lx838slUR51qz5yk8.png)

やりましたね。

プロジェクトの名前はお好きに。SSHのキーについては、RPMインストール時に作られるrundeckユーザーのキーが`/home/rundeck/.ssh/rundeck.id_rsa`なので、ここにしておくと手間が少なくて済む。他の値については、今回はデフォルトで。

この後説明するホストやジョブはプロジェクト単位で管理していくことになる。

![Run](/images/2012-01-03-rundeckjenkinsjava/tumblr_lx840qzSI71qz5yk8.png)

左上のメニューに注目

  * Run … 一回こっきりのコマンド。非定型な処理（緊急でアプリケーションサーバー順々に再起動かけたいとか）はここから実行できる。capistrano の `cap shell` みたいなイメージ
  * Job … 複数のコマンドや条件を保存はここに登録。
  * Histoly … 実行履歴が確認出来る。

最初は localhost だけがホストに登録されているから、Run を選択後、真ん中の入力フォームからコマンドを実行してみる。

![exec_uname](/images/2012-01-03-rundeckjenkinsjava/tumblr_lx84c0tw7g1qz5yk8.png)

実行できた。

### ホスト追加

ローカルホストにばかりいじっていても不毛なので、ホストを追加していく。ユーザー同様ホストについても設定ファイルを編集する必要がある。

rundeck をインストールしたサーバーで公開鍵をメモ

    
    rundeck$ sudo su - rundeck
    rundeck$ cat .ssh/rundeck.id_rsa.pub # 出力結果をメモ
    

各ホストに作業用ユーザー「deploy」を追加する - パスワード不要でsudo可能。 - パスワードは設定しない - SSH
の鍵認証でパスフレーズ無しにログイン可能

    
    以下、デプロイ対象サーバー(仮に192.168.10.10とする)
    192.168.10.10$ sudo /sbin/useradd deploy
    192.168.10.10$ sudo /usr/sbin/visudo
    
      // tty が使えないとSSH経由のコマンドに問題が起きるので、無効化する
      Defaults:deploy    !requiretty
      deploy  ALL=(ALL)       NOPASSWD: ALL
    
    192.168.10.10$ mkdir -m 700 /home/deploy/.ssh
    192.168.10.10$ sudo vim /home/deploy/.ssh/authorized_keys # rundeck の公開鍵を登録
    192.168.10.10$ sudo chown -R deploy.deploy /home/deploy/.ssh
    

いったん rundeck 側からログインしてみる。

    
     ここからはまた rundeck をインストールしたサーバーの話
    $ sudo su - rundeck
    $ touch .ssh/config
    $ chmod 600 .ssh/config
    $ vim .ssh/config
        このあともがしがしサーバー追加していくので、LAN内のマシンについては指紋チェック無効化しておく
        Host 192.168.*.*
            StrictHostKeyChecking no
    $ ssh -i ~/.ssh/rundeck.id_rsa deploy@192.168.10.10
    

次に設定ファイル編集

    
    $ sudo vim /var/rundeck/projects/example/etc/resources.xml
    
    以下のような行を追加。name, hostname, username 辺りは重要だけど、それ以外は適当に指定。絞り込みの時に使えるので、tags あたりはしっかり入力しておいたほうがいい。
    <node name="target1" description="適当" tags="適当" hostname="192.168.10.10" osArch="適当" osFamily="適当" osName="適当" osVersion="適当" username="deploy" />
    

これで再起動させればrundeck側からホストが操作できるようになっているはず。target1(192.168.115.60), target2(192.168.115.61)を追加して画面から確認してみる。

![フィルタ変更](/images/2012-01-03-rundeckjenkinsjava/tumblr_lx96zd197m1qz5yk8.png)

フィルタの変更でとりあえず全部外して、全台表示にする。

![フィルタ変更後](/images/2012-01-03-rundeckjenkinsjava/tumblr_lx96zqf2uJ1qz5yk8.png)

確認できた。ここでコマンドを打てば全台に適用される。

### ジョブ追加

サーバーがセットアップ出来たので、ジョブを追加していく。メニューから`Jobs`を選択して、`New job`をクリックすればいい。全部画面に書いてあるけど、一応説明すると:

  * Saved this job? ジョブを保存するかどうか 
    * Job Name … 名前
    * Group … グループ。スラッシュ区切りで入力しておくと、階層構造で表示してくれる
    * Description … 説明
    * UUID … UUID （これとは別に、ジョブを作ると勝手にID割り振られる）
  * Project どのプロジェクトを対象とするか
  * Workflow 
    * Keepgoing エラーで止まるかそのまま進むか
    * Strategy ノードが3台、ステップが2個あったとして、node1-step1, node1-step2, node1-step3, node2-step1 … とすすむのがNode-oriented、Node-oriented、node1-step1, node2-step1, node3-step1 と進んでいくのが Step-oriented
  * Step 実行するステップを指定。各行の右端にマウスをあわせると（入れ替えたり編集、削除したりできる） 
    * Command … コマンドの実行（Runでやったのと同じ）
    * Script … 複数行のスクリプトの実行
    * Script file … サーバー上にあるスクリプトファイルの実行
    * Job Reference … 他のジョブを実行
  * Dispatch to Nodes … これを選択しないと、ローカルホストだけで実行される。選択すると実行対象の絞り込み画面が表示されるので、タグやホスト名、その他条件を設定する。
  * Log level … ログの出力多寡を決定

サクサク作れるので、必要に応じてがしがし増やしていく。

![](/images/2012-01-03-rundeckjenkinsjava/tumblr_lx99jg4sze1qz5yk8.png)

## jenkins との連動

rundeck は[jenkins](http://jenkins-ci.org/)および[rundeckプラグイン](https://wiki
.jenkins-ci.org/display/JENKINS/RunDeck+Plugin)と連動して利用することが出来る。

プラグインはjenkinsのプラグイン管理画面に表示されるので、それを選択するだけでいい。

### jenkins から rundeck をキックする

jenkinsでビルド完了→rundeckでデプロイ→jenkinsで統合テスト実施、といった0-clickのデプロイパイプが作れるようになる。[0-clickは革命](http://www.otsune.com/diary/2008/09/11/1.html#200809111) 。

jenkinsの設定方法は[プラグインの説明ページ](https://wiki.jenkins-ci.org/display/JENKINS/RunDeck+Plugin#RunDeckPlugin-DeploymentPipeline)参照。

### rundeck からjenkins上の成果物を選択できるようにする。

rundeckで手動デプロイするとき、成果物名やビルドの名前を選択できるようにする。

jenkins rundeck プラグインは以下を利用出来るようにしてくれる:

  * 特定の成果物を起点に、ビルド履歴とその際の成果物を提供するAPI
  * 特定のビルドを起点に、その最新成果物一覧を提供するAPI

rundeck でジョブを実行するとき、ユーザー入力を受け付けることが出来るんだけど、この選択項目には外部から取得したJSONなども設定できる。この機能と先ほどのAPIを組み合わせることで実現出来る。

やってみよう。ジョブの保存画面でオプションを選択。

![オプション設定画面](/images/2012-01-03-rundeckjenkinsjava/tumblr_lx9bfrJrHn1qz5yk8.png)

![オプション設定画面2](/images/2012-01-03-rundeckjenkinsjava/tumblr_lx9c296d8I1qz5yk8.png)

  * Option Name … 変数名として使われる値。artifact を指定
  * Description … 適当
  * Default Value … 未設定でいい
  * Allowed Value … Remote URL からAPIのURLを指定（URLの形式は[ドキュメント参照](https://wiki.jenkins-ci.org/display/JENKINS/RunDeck+Plugin#RunDeckPlugin-OptionProvider)）
  * Restrictions … 値の形式チェック。Remote URLの値しか指定させたくないので、「Enforced from Allowed Values」を指定
  * Requirement … 必須かどうか。必須なので、当然「yes」
  * Multi-valued … 複数の値をとれるようにするか。複数の成果物を同時にデプロイしたい、とかであれば使えるかもしれないけど、今回は「No」
  * Usage … ここで指定した値をステップの部分でどのように使えばいいのか説明してくれている。

併せて、受け取った値を表示するだけのステップを作ってみる。

![ステップ](/images/2012-01-03-rundeckjenkinsjava/tumblr_lx9cj2ACEP1qz5yk8.png)

実行してみよう。最初にビルド番号を聞かれる。

![成果物一覧](/images/2012-01-03-rundeckjenkinsjava/tumblr_lx9cobBFg31qz5yk8.png)

適当に選んで「Run Job Now」すると、さっき作った変数を表示するだけのスクリプトが動いて、指定した成果物のURLが表示され、連携がうまくいっていたことが確認出来る。

![実行結果](/images/2012-01-03-rundeckjenkinsjava/tumblr_lx9dlhjwmr1qz5yk8.png)

詳細なデプロイ手順については、各環境ごとにあるだろうからアレンジしてもらえればと思う。

## まとめ

ホストやユーザーの設定をいちいちファイル編集しなくちゃいけなかったりするのが、ちょっとかっこわるいかな。ただ、UIはわかりやすいし、セットアップも簡単なので
、気軽に試してみるといいと思う。

