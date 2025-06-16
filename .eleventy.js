const eleventySass = require("eleventy-sass");

module.exports = function(eleventyConfig) {
  // Sass plugin
  eleventyConfig.addPlugin(eleventySass);

  // Enable indented code blocks (4 spaces)
  eleventyConfig.amendLibrary("md", mdLib => mdLib.enable('code'));

  // Ignore CLAUDE.md from build
  eleventyConfig.ignores.add("CLAUDE.md");

  // Static files passthrough
  eleventyConfig.addPassthroughCopy("public");
  
  // Copy legacy post directory
  eleventyConfig.addPassthroughCopy("content/post");
  eleventyConfig.addPassthroughCopy("content/javascripts");
  eleventyConfig.addPassthroughCopy("content/stylesheets");

  // Collections
  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("content/*.md")
      .filter(post => post.data.published !== false)
      .sort((a, b) => {
        return new Date(b.data.created_at) - new Date(a.data.created_at);
      });
  });


  // Tags collection
  eleventyConfig.addCollection("tagList", function(collectionApi) {
    const tagSet = new Set();
    collectionApi.getFilteredByGlob("content/*.md").forEach(item => {
      if ("tags" in item.data) {
        let tags = item.data.tags;
        if (typeof tags === "string") {
          tags = [tags];
        }
        tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet);
  });

  // Custom permalink computation
  eleventyConfig.addFilter("postPermalink", function(fileSlug) {
    // Extract YYYY-MM-DD-slug from fileSlug
    const match = fileSlug.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
    if (match) {
      const [, year, month, day, slug] = match;
      return `/blog/${year}/${month}/${day}/${slug}/`;
    }
    return `/${fileSlug}/`;
  });

  // Date filters
  eleventyConfig.addFilter("dateFormat", function(date, format) {
    const d = new Date(date);
    if (format === "yyyy.MM.dd") {
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    }
    return d.toISOString();
  });

  // RSS date format
  eleventyConfig.addFilter("rssDate", function(date) {
    if (date === "now" || !date) {
      return new Date().toISOString();
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return new Date().toISOString();
    }
    return d.toISOString();
  });

  // Filter posts by tag
  eleventyConfig.addFilter("filterByTag", function(posts, tag) {
    return posts.filter(post => {
      if (!post.data.tags) return false;
      if (typeof post.data.tags === "string") {
        return post.data.tags === tag;
      }
      return post.data.tags.includes(tag);
    });
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    templateFormats: ["md", "markdown", "liquid", "html", "njk"],
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    dataTemplateEngine: "liquid"
  };
};