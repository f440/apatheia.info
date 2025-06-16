---
layout: layouts/post.liquid
permalink: /blog/2012/07/30/roundsman-capistrano-chef-solo/
title: roundsmanを使ってcapistranoからchef-soloを実行する
created_at: 2012-07-30 00:00:00 +09:00
kind: article
tags:
comments: true
published: true
---
管理対象のサーバー台数が少ない場合など、[chef](http://www.opscode.com/chef/)のサーバーを運用するコストとベネフィットを天秤にかけてみて、ああこれどう考えても労力ペイできないな、でも設定ファイルを手動で管理するのはやだな、といったときに[roundsman](https://g
ithub.com/iain/roundsman)を使うといいという話。

<!-- more -->

[roundsman](https://github.com/iain/roundsman)は、chefのレシピを転送して[chef-solo](http://wiki.opscode.com/display/chef/Chef+Solo)を実行する[capistrano](https://github.com/capistrano/capistrano)向けライブラリ。アプリケーションのリリースタイミングに併せてインフラ設定の変更が必要になることは往々にしてあるので、[capistrano](https://github.com/capistrano/capistrano)を使ってデプロイとインフラ設定変更を一括適
用できるのは便利だ。

ここでは、Railsアプリを対象に[roundsman](https://github.com/iain/roundsman)適用までの作業を簡単にまとめる。

## 手順

まずは適当なRailsプロジェクトを作るところから。

    
    PROJECT="my_fantastic_project"
    rails new $PROJECT
    cd $PROJECT
    
    $EDITOR Gemfile
      # 追加
      gem roundsman, :require => false
      gem capistrano, :require => false
    
    bundle install --path vendor/bundle
    
    # capistranoのCapfile、config/deploy.rbを生成
    bundle exec capify .
    

chefのcookbooksは`config/cookbooks`に配置する。場所は設定で変更可能。このディレクトリだけ別リポジトリにしておくと、ほかのプロジェクトでも転用できて便利なのでそうしてる。

config/deploy.rbを調整する。サーバーの種別ごとにデプロイを切り替えたいので、マルチステージを有効化。

    
    $EDITOR config/deploy.rb
    
    # 追加
    # require roundsman/capistrano
    # require capistrano/ext/multistage
    

サーバーグループの設定を`config/deploy/*.rb`に配置。これについては、[capistrano/ext/multistage](https:
//github.com/capistrano/capistrano/wiki/2.x-Multistage-Extension)の説明を参照。

あとは`config/deploy.rb`でrecipeを実行するタスクを追加し、`config/deploy/*.rb`の中でattributeを設定していく。

    
    config/deploy.rb:
    
        namespace :chef do
          set :care_about_ruby_version, false
    
          # 一括して適用
          task :default do
            roundsman.run_list fetch(:run_list)
          end
    
          # 個別にレシピ適用 (ex. nginx)
            namespace :nginx do
              task :install do
                roundsman.run_list "recipe[nginx]"
              end
            end
    
          end
    

[githubにある設定方法の説明](https://github.com/iain/roundsman#configuration)だと、config/ステージ名.rb に設定を書いている。

    
    config/deploy/*.rb:
    
        set :nginx, :user => "nginx", "worker_process" => 1, …
        set :run_recipe, :user => "nginx", "worker_process" => 1, …
    

ただ、これだとattributesの管理がcapistranoの中にべったり書くことになってしまい、chef-soloを手で実行したいときとか面倒くさい。そのため、attributesの値はknifeやchef-
soloで読めるようなjsonを作って、config/roles 以下で管理している。

roles ディレクトリはアプリのアップデートと関係なく更新していくことになるので、別リポジトリで管理した方がいい。

    
    ファイル構成(抜粋)
    
      ├── Capify
      ├── Gemfile
      └── config
            ├── cookbooks
            ├── deploy
            └── roles
    
    config/deploy.rb:
    
      # jsonファイルを取り込む関数を追加
      require active_support/core_ext/hash/deep_merge
      def load_role(*roles)
        json = {}
        roles.each do |role|
          json_path = "#{File.dirname(__FILE__)}/roles/#{role}.json"
          json.deep_merge! JSON.load(File.new(json_path))
        end
        json.each {|k,v| set (k.to_sym), v }
     end
    
    config/deploy/*.rb:
    
      # 読み込みたいjsonファイルを指定
      load_role "web"
    
    config/roles/*.json:
    
     例: config/roles/web.json
      {
         "nginx" : {
          "user" : "nginx",
          "worker_processes" : 1,
        …
         "run_list" : [ "recipe[nginx]", ... ]
      }
    

以上で準備が整った。これで実行できるようになる。

    
    # 一括適用
    bundle exec cap ステージ名 chef
    
    # cookbook を指定して適用
    bundle exec cap ステージ名 chef:nginx
    

