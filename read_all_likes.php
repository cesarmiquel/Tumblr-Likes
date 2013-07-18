<?php

# Change these to your API key and posts
$api_key = '[api key]';
$blog    = '[blog name]';
$max_num_posts = 1000;

for($i = 0; $i < $max_num_posts; $i += 20) {
    $url = "http://tumblr-likes.appspot.com/process?blog_name=$blog.tumblr.com&api_key=$api_key&offset=$i";
    file_get_contents($url);
}
