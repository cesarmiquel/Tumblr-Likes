Tumblr-Likes
============

Creates a page in App Engine were you can browse your Tumblr likes posts.

This is an App Engine python webapp. It basically pulls your Tumblr Likes
into an NDB database (https://developers.google.com/appengine/docs/python/ndb/)
and then a JS webapp pulls information to display your likes. You can see my
Tumblr likes here:

http://tumblr-likes.appspot.com

To use this you need to deploy the app to Google App engine. Once deployed 
you need to repetedly call this url:

http://[app id].appspot.com/process?blog_name=[your-blog].tumblr.com&api_key=[api key]&offset=[offset]

where:

* [app id] is your Google Engina App id
* [your-blog] is the name of your Tumblr blog
* [api key] is an API key you need to generate for your blog
* [offset] is an offset to your liked posts. The Tumblr API can only read 20 likes 
at a time. For now you have to manually (i've included a simple PHP script which will 
call this URL until you reached 1000 posts which is the maximum Tumblr returns)

This process will populate the NDB with the posts/images. Once you've populated the DB
you can access your posts here:

http://[app id].appspot.com/

This is *really* manual now. I'll improve the process shortly. Will probably have setup
a form and allow you to put the key and blog name and it will populate via JS. Stay
tuned. I'm only including this in case you stumble upon this site and want to test it.

Deploying
---------

appcfg.py update <appdir>


Cesar
miquel@easytech.com.ar


