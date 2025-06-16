---
layout: layouts/post.liquid
permalink: /blog/2013/03/17/fluentd-and-graphite/
title: "FluentdのデータをGraphiteに出力するときのTips"
created_at: 2013-03-17 15:50:00 +9:00
kind: article
comments: true
tags:
  - fluentd
  - graphite
  - logging
  - visualization
---

[fluent-plugin-graphite] 利用時のメモ。

Ops界隈での可視化というと、ここ何年かは[Graphite]でグラフを作ってそれを他のツールで表示する、みたいなのが多い。[Fluentd]のデータを可視化したい場合は[GrowthForecast]が使われることが多いけど、[Graphite]使ってみるといろんなツールと組み合わせられておもしろい。

<!-- more -->

Fluentd から Graphite へデータを送るのは [Fluent-plugin-graphite] を使えば簡単に実現できそうなんだけど、プラグイン側のインターフェース(`:key` や `:count` といったキーが必要)に合わせて入力のデータを整形する必要がある。

こういった調整は、out\_map を使うことで実現できる。

    <source>
      type tail
      format apache
      path /var/log/httpd/access_log
      tag apache.access
    </source>
    <match apache.access>
      type map
      map [["graphite." + tag, time, {"key" => "graphite.apache.accesslog.code." + record["code"], "count" => 1}]]
      multi true
    </match>
    <match graphite.**>
      type graphite
    </match>

[Fluentd]: http://fluentd.org/
[Graphite]: http://graphite.wikidot.com/
[GrowthForecast]: http://kazeburo.github.com/GrowthForecast/
[fluent-plugin-graphite]: https://github.com/hotchpotch/fluent-plugin-graphite
