<?php

# Change these to your API key and posts
$api_key = '[api_key]';
$blog    = '[blog_name]';
$max_num_posts = 1000;

$total = 0;
for($i = 0; $i < $max_num_posts; $i += 20) {
    $url = "http://tumblr-likes.appspot.com/process?blog_name=$blog.tumblr.com&api_key=$api_key&offset=$i";
    $out = file_get_contents($url);
    $result = json_decode($out);
    printf( "Saved [%s] posts.\n", $result->posts_saved);
    $total += $result->posts_saved;
}

print "\n\nSaved $total posts.\n";
