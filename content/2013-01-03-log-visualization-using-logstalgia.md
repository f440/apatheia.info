---
layout: layouts/post.liquid
permalink: /blog/2013/01/03/log-visualization-using-logstalgia/
title: "logstalgia を使ってログを可視化"
created_at: 2013-01-03 18:50:00 +9:00
kind: article
comments: true
tags:
  - logging
  - visualization
---

Webサーバーのログでピンポンゲームの映像を生成する[logstalgia]。

<!-- more -->

homebrew がインストール済みなら以下で動かせる。

    gem install apache-loggen
    brew install logstalgia
    apache-loggen --rate 10 | logstalgia -

[apache-loggen] はApacheのダミーログを生成してくれるスクリプト。便利。

![logstalgia](/images/2013-01-03-log-visualization-using-logstalgia/logstalgia.png)

## 参考

- [logstalgia]
- [apache-loggen]

[logstalgia]: https://code.google.com/p/logstalgia/ "logstalgia"
[apache-loggen]: http://mt.orz.at/archives/2012/11/apacherubygems.html "apache-loggen"
