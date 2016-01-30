$(window).load(function() {

	window.selectedBlog = '';
  window.blogs = [];

  window.app = {
		settings : {
			masonryColumnWidth: 320,
  	}
  };

  // get posts and init flexslider when done
  $.getJSON('/blogs', function(data) {
    var html = '';
    html += '<li><a href="#likes" data-blog="likes" class="blog-icon"><img class="avatar" src="images/star.png" /></a></li>';
    window.blogs['likes'] = {'info': {name: 'likes', posts: 0, title:'Likes', url:''}}
    for(var i = 0; i < data.blogs.length; i++) {
      var blog = data.blogs[i];
      html += '<li><a href="#' + blog.name + '" data-blog="' + blog.name + '" class="blog-icon"><img class="avatar" src="http://api.tumblr.com/v2/blog/' + blog.url + '/avatar" /></a></li>';
      window.blogs[blog.name] = {'info': blog}
    }
    $('.flexslider .slides').append(html);

    $('.flexslider').flexslider({
        animation: "slide",
        animationLoop: false,
        slideshow: false,
        controlNav: false,
        mouseWheel: false,
        itemWidth: 60,
        itemMargin: 5
    });

    $('.blog-icon').hover(function() {
      var blogName = $(this).data('blog');
      showBlogInfo(blogName);
    });

    $('.blog-icon').click(function() {
      var blogName = $(this).data('blog');
      showBlog(blogName, 0)
    });

    // if the URL specifies a blog show it.
    var hash = window.location.hash;
    if (hash != '') {
      var query = window.location.search.substring(1);
      var vars = query.split('&');
      var page = 0;
      for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (pair[0] == 'page') {
          page = pair[1]
        }
      }
      showBlog(hash.replace('#', ''), page);
    }
  });

	// hide blog info on start
	$('#blog-info').hide();

	$(window).resize(function() {
		// force width
		$('#main article').width($('#main').width());

		// Run masonry
		var $container = $('.blog-posts');
		$container.imagesLoaded(function(){
			var $grid = $container.masonry({
				itemSelector : '.blog-post',
				columnWidth : window.app.settings.masonryColumnWidth,
				gutter: 10,
				isFitWidth: true,
				containerStyle: {position: 'relative'},
			});
      addScrollHandler();
		});
	});

	// show hide icons
	$(document).mousemove(function(e) {
		window.barVisible = window.barVisible == undefined  ? true : window.barVisible;
		window.barAnimating = window.barAnimating == undefined  ?  false : window.barAnimating;
		var y = e.pageY;
		y += $('html').offset().top;
		if (window.barVisible && y > 90 && !window.barAnimating) {
			window.barVisible = false;
			window.barAnimating = true;
			$('.flexslider').animate({'margin-top': '-=65'}, 250, function() {window.barAnimating = false});
			// show selected blog
			if (window.selectedBlog != '') {
				showBlogInfo(window.selectedBlog);
			}
		}
		else if (window.barVisible == false && y < 20 && window.barAnimating == false) {
			window.barVisible = true;
			window.barAnimating = true;
			$('.flexslider').animate({'margin-top': '+=65'}, 250, function() {window.barAnimating = false});
		}
	});

	// helpers
	function showBlogInfo(blogName) {
		var info = window.blogs[blogName].info;
		var numPosts = info.posts > 0 ? info.posts : 'many';
		var title = '';
		if (info.title) {
			title = info.title;
		}
		else {
			title = blogName + '.tumblr.com';
		}

		// truncate title
		if (title.length > 30) {
			title = title.substr(0, 30) + '...';
		}
		var html = '<img src="http://api.tumblr.com/v2/blog/' + info.url + '/avatar" />' + '<h2>' + title + '</h2>';
		html += '<p><a href="http://' + info.url + '" target="_blank">' + info.url + '</a>'
		  + ' - <a href="http://' + info.url + '/archive" target="_blank">archive</a><br/>'
		  + '<span class="num-posts">' + numPosts + ' posts</span></p>';
		$('#blog-info').html(html);
		$('#blog-info').show();
	}


  // show a blogs
  function showBlog(blogName, page) {

    // if we don't have the data yet pull it via JSON
    // and then call this function again.
    if (window.blogs[blogName].posts == undefined) {

      // first time. Bring via API:
      $.getJSON('/posts', {blog_name: blogName, page: page}, function(data) {
        window.blogs[data.name].posts = data.posts;
        window.blogs[data.name].current_cursor = data.cursor;
        window.blogs[data.name].page = page;
        showBlog(blogName, page);
      });

      return;
    }

    blogData = window.blogs[blogName];

    // set opacity on previously selected blog to 1
    if (window.selectedBlog != '') {
      $img = $("[data-blog='" + window.selectedBlog + "'] img");
      if( $img) {
        $img.css('opacity', 1);
      }
    }

		var html = '<article class="blog-posts">';
		for(var i = 0; i < blogData.posts.length; i++) {
			var post = blogData.posts[i];
      html += getBlogArticleMarkup(post);
		}
		html += '</article>';

		$('#main').html(html);

		// force width
		$('#main article').width($('#main').width());

		// Run masonry
		var $container = $('.blog-posts');
		$container.imagesLoaded(function(){
			var $grid = $container.masonry({
				itemSelector : '.blog-post',
				gutter : 10,
				columnWidth : window.app.settings.masonryColumnWidth,
				isFitWidth: true,
				containerStyle: {position: 'relative'},
			});
      addScrollHandler();
		});

    // bind colorbox
    $('a.colorbox').colorbox();

    // Save blog name
		window.selectedBlog = blogName;

    // change opacity on selected blog
    $img = $("[data-blog='" + selectedBlog + "'] img");
    if( $img) {
      $img.css('opacity', 0.3);
    }
  }

  function getBlogArticleMarkup(post) {
    var strippedCaption = stripTags(post.caption);

    html = '';
	  html += '<section class="blog-post" style="width:' + (window.app.settings.masonryColumnWidth - 20)+ 'px">';
		html += '<ul>';
    for(var j = 0; j < post.photos.length; j++) {
      var image_url = post.photos[j].url;
      if (post.photos[j].medium_url) {
          image_url = post.photos[j].medium_url;
      }
      html += '<li>';
      html += '<a href="' + post.photos[j].url + '" class="colorbox">';
      html += '  <img src="' + image_url + '" class="img-responsive clearfix" />';
      html += '</a>';
      html += '<a href="//pinterest.com/pin/create/button/?url=' + encodeURIComponent(post.post_url);
      html += '&media=' + encodeURIComponent(image_url);
      html += '&description=' + encodeURIComponent(strippedCaption + '\nhttp://' + blogData.name + '.tumblr.com') + '"';
      html += ' data-pin-do="buttonPin"';
      html += ' data-pin-config="above">';
      html += '<img src="//assets.pinterest.com/images/pidgets/pin_it_button.png" />';
      html += '</a>';
      html += '</li>';
    }
    html += '</ul>';
    if (post.caption != '') {
      html += '<div class="caption">';
      html += post.caption;
      html += '</div>';
    }
    html += '<div class="permalink">';
    html += '  <a href="' + post.post_url + '" target="_blank"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAALVWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNC4yLjItYzA2MyA1My4zNTI2MjQsIDIwMDgvMDcvMzAtMTg6MTI6MTggICAgICAgICI+CiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICB4bWxuczpwaG90b3Nob3A9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGhvdG9zaG9wLzEuMC8iCiAgICB4bWxuczpJcHRjNHhtcENvcmU9Imh0dHA6Ly9pcHRjLm9yZy9zdGQvSXB0YzR4bXBDb3JlLzEuMC94bWxucy8iCiAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgICB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIKICAgIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiCiAgICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgICB4bWxuczp4bXBSaWdodHM9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9yaWdodHMvIgogICBwaG90b3Nob3A6QXV0aG9yc1Bvc2l0aW9uPSJBcnQgRGlyZWN0b3IiCiAgIHBob3Rvc2hvcDpDcmVkaXQ9Ind3dy5nZW50bGVmYWNlLmNvbSIKICAgcGhvdG9zaG9wOkRhdGVDcmVhdGVkPSIyMDEwLTAxLTAxIgogICBJcHRjNHhtcENvcmU6SW50ZWxsZWN0dWFsR2VucmU9InBpY3RvZ3JhbSIKICAgeG1wOk1ldGFkYXRhRGF0ZT0iMjAxMC0wMS0wM1QyMTozMzoxMyswMTowMCIKICAgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjc5MDBEODNDODFGN0RFMTE5RUFCOTBENzA3OEFGOTRBIgogICB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjc5MDBEODNDODFGN0RFMTE5RUFCOTBENzA3OEFGOTRBIgogICB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkYwNDQxNTM3QTdGOERFMTE4MjFDRTRCMkM3RTM2RDcwIj4KICAgPElwdGM0eG1wQ29yZTpDcmVhdG9yQ29udGFjdEluZm8KICAgIElwdGM0eG1wQ29yZTpDaUFkckNpdHk9IlByYWd1ZSIKICAgIElwdGM0eG1wQ29yZTpDaUFkclBjb2RlPSIxNjAwMCIKICAgIElwdGM0eG1wQ29yZTpDaUFkckN0cnk9IkN6ZWNoIFJlcHVibGljIgogICAgSXB0YzR4bXBDb3JlOkNpRW1haWxXb3JrPSJrYUBnZW50bGVmYWNlLmNvbSIKICAgIElwdGM0eG1wQ29yZTpDaVVybFdvcms9Ind3dy5nZW50bGVmYWNlLmNvbSIvPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJzYXZlZCIKICAgICAgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDo3OTAwRDgzQzgxRjdERTExOUVBQjkwRDcwNzhBRjk0QSIKICAgICAgc3RFdnQ6d2hlbj0iMjAxMC0wMS0wMlQxMDoyODo1MSswMTowMCIKICAgICAgc3RFdnQ6Y2hhbmdlZD0iL21ldGFkYXRhIi8+CiAgICAgPHJkZjpsaQogICAgICBzdEV2dDphY3Rpb249InNhdmVkIgogICAgICBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOkMwRDdEQjAxREJGN0RFMTFBOTAwODNFMEExMjUzQkZEIgogICAgICBzdEV2dDp3aGVuPSIyMDEwLTAxLTAyVDIxOjExOjI2KzAxOjAwIgogICAgICBzdEV2dDpjaGFuZ2VkPSIvbWV0YWRhdGEiLz4KICAgICA8cmRmOmxpCiAgICAgIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiCiAgICAgIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6RjA0NDE1MzdBN0Y4REUxMTgyMUNFNEIyQzdFMzZENzAiCiAgICAgIHN0RXZ0OndoZW49IjIwMTAtMDEtMDNUMjE6MzM6MTMrMDE6MDAiCiAgICAgIHN0RXZ0OmNoYW5nZWQ9Ii9tZXRhZGF0YSIvPgogICAgPC9yZGY6U2VxPgogICA8L3htcE1NOkhpc3Rvcnk+CiAgIDxkYzp0aXRsZT4KICAgIDxyZGY6QWx0PgogICAgIDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+Z2VudGxlZmFjZS5jb20gZnJlZSBpY29uIHNldDwvcmRmOmxpPgogICAgPC9yZGY6QWx0PgogICA8L2RjOnRpdGxlPgogICA8ZGM6c3ViamVjdD4KICAgIDxyZGY6QmFnPgogICAgIDxyZGY6bGk+aWNvbjwvcmRmOmxpPgogICAgIDxyZGY6bGk+cGljdG9ncmFtPC9yZGY6bGk+CiAgICA8L3JkZjpCYWc+CiAgIDwvZGM6c3ViamVjdD4KICAgPGRjOmRlc2NyaXB0aW9uPgogICAgPHJkZjpBbHQ+CiAgICAgPHJkZjpsaSB4bWw6bGFuZz0ieC1kZWZhdWx0Ij5UaGlzIGlzIHRoZSBpY29uIGZyb20gR2VudGxlZmFjZS5jb20gZnJlZSBpY29ucyBzZXQuIDwvcmRmOmxpPgogICAgPC9yZGY6QWx0PgogICA8L2RjOmRlc2NyaXB0aW9uPgogICA8ZGM6Y3JlYXRvcj4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGk+QWxleGFuZGVyIEtpc2VsZXY8L3JkZjpsaT4KICAgIDwvcmRmOlNlcT4KICAgPC9kYzpjcmVhdG9yPgogICA8ZGM6cmlnaHRzPgogICAgPHJkZjpBbHQ+CiAgICAgPHJkZjpsaSB4bWw6bGFuZz0ieC1kZWZhdWx0Ij5DcmVhdGl2ZSBDb21tb25zIEF0dHJpYnV0aW9uIE5vbi1Db21tZXJjaWFsIE5vIERlcml2YXRpdmVzPC9yZGY6bGk+CiAgICA8L3JkZjpBbHQ+CiAgIDwvZGM6cmlnaHRzPgogICA8eG1wUmlnaHRzOlVzYWdlVGVybXM+CiAgICA8cmRmOkFsdD4KICAgICA8cmRmOmxpIHhtbDpsYW5nPSJ4LWRlZmF1bHQiPkNyZWF0aXZlIENvbW1vbnMgQXR0cmlidXRpb24gTm9uLUNvbW1lcmNpYWwgTm8gRGVyaXZhdGl2ZXM8L3JkZjpsaT4KICAgIDwvcmRmOkFsdD4KICAgPC94bXBSaWdodHM6VXNhZ2VUZXJtcz4KICA8L3JkZjpEZXNjcmlwdGlvbj4KIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+Cjw/eHBhY2tldCBlbmQ9InIiPz6hl/JYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAaRJREFUeNqMU0uKwkAQtZP426kLmZ0REQTRiB7APsYs4w28gfEGzgnSnmQyNzAL14obUcFkI4ifZF6FtDhiHBuKqu6q9+rT3Sz1xjIMY6QoiiX3QRBYruuOyWb/gZvNpg1lPnGJ+Xw+UF+B6/W6jWwmJBWGoQU9uV6vH9A6pFMqlZIrqFQqfcaYE5XJmLlYLKbSV61Wv0HIyVaSCC6XCz+fz6RNZHJ6vZ4hfafTaUI+kkSCOEAUi0UiWcKetVotIyboSII/LXS73T5UVJrv+46qqjqmL1Bu5Ietr9drjpZE3Jp1I2i327dpU8B+v3fuwTSH7XZLJELewuFwGEQEjUbDpoA4cLjb7fxHMAj5fQK0MYjsWq02grZk4GazoczLezDt0RKPMzvw/cjKNQxCvjBrtVpNc7mcQfcuweVymXpeep43fjZsRU4TJc3o4Hg8utjTlPVCoRBdI/mTlgIggYlkKA9Roovr4wCL2OckEajpdJo+B6fnmclkOMTPZrOfIJlQKxCB8r9efph8Pm+j9/BR6Dz17tI0bYSHE8bi0f4d3K8AAwBwQv2cykLpkgAAAABJRU5ErkJggg==" alt="permalink" title="permalink"/></a>'
 		html += '</section>';
    return html;
  }

  function addScrollHandler() {
    var load_more = $('#load-more-button.un-processed');
    if (load_more.length == 1) {

      $('#load-more-button.un-processed').removeClass("un-processed");

      $('#load-more-button').click(function() {

        // Retrieve more posts if there is a valid cursor
        if (blogData.current_cursor == '') {
          return;
        }
        $.getJSON('/posts', {blog_name: blogData.info.name, cursor: blogData.current_cursor, page: blogData.pate}, function(data) {
          // Add items to bottom
          var $container = $('.blog-posts');
          for(i = 0; i < data.posts.length; i++) {
            var post = data.posts[i];
            var e = $(getBlogArticleMarkup(post));
            $container.append(e).masonry('appended', e);
          }

          window.blogs[data.name].posts = window.blogs[data.name].posts.concat(data.posts);
          window.blogs[data.name].current_cursor = data.cursor;
 
          // Run masonry
          var $container = $('.blog-posts');
          $container.imagesLoaded(function(){
            $container.masonry({
              itemSelector : '.blog-post',
              gutter : 10,
              columnWidth : window.app.settings.masonryColumnWidth,
              isFitWidth: true,
              containerStyle: {position: 'relative'},
            });
          });

          // Hide more link if no more posts
          if (data.more == false) {
            $('.load-more-container').hide();
          }

        });

        return false;


     });
   }
  }

  function stripTags(html) {
    var strippedContent = document.createElement("DIV");
    strippedContent.innerHTML = html;
    return strippedContent.textContent || strippedContent.innerText;
  }
});
