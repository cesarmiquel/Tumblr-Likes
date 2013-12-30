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
      showBlog(blogName)
    });

    // if the URL specifies a blog show it.
    var hash = window.location.hash;
    if (hash != '') {
      showBlog(hash.replace('#', ''));
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
			$container.masonry({
				itemSelector : '.blog-post',
				columnWidth : window.app.settings.masonryColumnWidth,
				gutter: 10,
				isFitWidth: true,
				containerStyle: {position: 'relative'},
			});
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
		var numPosts = info.posts
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
  function showBlog(blogName) {

    // if we don't have the data yet pull it via JSON
    // and then call this function again.
    if (window.blogs[blogName].posts == undefined) {

      // first time. Bring via API:
      $.getJSON('/posts', {blog_name: blogName}, function(data) {
        window.blogs[data.name].posts = data;
        showBlog(blogName);
      });

      return;
    }

    blogData = window.blogs[blogName].posts;

    // set opacity on previously selected blog to 1
    if (window.selectedBlog != '') {
      $img = $("[data-blog='" + window.selectedBlog + "'] img");
      if( $img) {
        $img.css('opacity', 1);
      }
    }

		var html = '<article class="blog-posts">';
		for(var i = 0; i < blogData.posts.length; i++) {
			html += '<section class="blog-post" style="width:' + (window.app.settings.masonryColumnWidth - 20)+ 'px">';
			html += '<ul>';
			var post = blogData.posts[i];
      var strippedCaption = stripTags(post.caption)
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
			html += '</section>';
		}
		html += '</article>';

		$('#main').html(html);

		// force width
		$('#main article').width($('#main').width());

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

  function stripTags(html) {
    var strippedContent = document.createElement("DIV");
    strippedContent.innerHTML = html;
    return strippedContent.textContent || strippedContent.innerText;
  }
});
