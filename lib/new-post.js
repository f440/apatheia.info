const fs = require("fs");
const dateFns = require("date-fns");

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: npm run new-post SLUG");
  process.exit(1);
}

const now = new Date();
const yyyymmdd = dateFns.format(now, "yyyy-MM-dd");

const path = `content/${yyyymmdd}-${slug}.md`;
const content = `
---
layout: layouts/post.liquid
permalink: /blog/${dateFns.format(now, "yyyy/MM/dd")}/${slug}/
title:
created_at: ${dateFns.formatRFC3339(now)}
updated_at:
kind: article
tags:
comments: true
published: true
---
`.trimStart();

fs.writeFileSync(path, content);

console.log(`Create: ${path}`);
