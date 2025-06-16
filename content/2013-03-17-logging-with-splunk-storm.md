---
layout: layouts/post.liquid
permalink: /blog/2013/03/17/logging-with-splunk-storm/
title: "イベント管理にSplunk Stormを使ってみる"
created_at: 2013-03-17 21:17:00 +9:00
kind: article
comments: true
tags:
  - logging
  - visualization
  - splunk
---

[Splunk] はおそらくイベント・ログ管理のツールとしてはおそらくもっとも有名で、日本でも販売展開しているので知っている人も多いかと思う。その splunk が [Splunk Storm] というサービスを始めている。試しに使ってみたのでその感想。

<!-- more -->

料金に応じて、格納可能なデータの容量が増える課金体系。無料でも1GBまで利用可能。

データの取り込みは以下の方法が提供されている:

  - Syslog, Rsyslog, Syslog-ng などから転送
  - TCP/UDP を使って直接登録
    - `cat some_file.log | nc endpoind_hostname port` で登録可能
  - HTTP API
  - forwarder と呼ばれるクライアントプログラム
    - ログの読み取りなども可能
  - ファイルアップロード

試しにアカウントをとってApacheのログ形式のデータをncでがんがん取り込んでみたところ、1GB を超えたところでもうこれ以上追加できないとのメールが届いた。結果、200万件以上のデータが登録できていた。

複雑な検索式を使って特定の条件に合うレコードを弾き出したり、図示することができる。たとえば、ステータスコードでグルーピングしたグラフを表示するには、以下の検索式を指定する。

    sourcetype="access_combined" status="*" | timechart count by status

リアルタイムで計算しているらしく、新しい時間帯から古い時間帯へとどんどんグラフが追加されていく。

![httpstatus](/images/2013-03-17-logging-with-splunk-storm/httpstatus.png)

さすがというか、よくできている。

[Splunk]: http://www.splunk.com/
[Splunk Storm]: https://www.splunkstorm.com/storm/
