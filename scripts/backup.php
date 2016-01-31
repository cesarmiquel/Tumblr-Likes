<?php

// ==================================================================
// This scripts connects to the tumblr-likes App, pulls the list
// of blogs and then downloads a JSON file for each blog and stores
// it in the backup directory as blog_name.json
// ==================================================================

$blog_list_url = "http://tumblr-likes.appspot.com/blogs";

$response = json_decode(file_get_contents($blog_list_url));

$blogs = $response->blogs;
foreach($blogs as $blog) {
    $name = $blog->name;
    print "Retreiving $name..\n";
    $blog_url = sprintf("http://tumblr-likes.appspot.com/posts?blog_name=%s", $blog->name);
    $blog_data = file_get_contents($blog_url);
    file_put_contents('backup/' . $name . '.json', $blog_data);
}
