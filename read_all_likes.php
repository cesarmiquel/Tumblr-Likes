<?php

for($i = 0; $i < 100; $i += 20) {
    $url = "http://tumblr-likes.appspot.com/process?blog_name=hypro.tumblr.com&api_key=33j1VK6U6qgjzHyjkZvpbfS3ECy4R4bWgUrK20RfnYqLu7Hnhu&offset=" . $i;
    file_get_contents($url);
}
