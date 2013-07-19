import os
import urllib
import json

from google.appengine.api import users
from google.appengine.ext import ndb
from google.appengine.api import urlfetch

import jinja2
import webapp2


JINJA_ENVIRONMENT = jinja2.Environment(
    loader = jinja2.FileSystemLoader(os.path.dirname(__file__) + '/templates'),
    extensions = ['jinja2.ext.autoescape'])


# Blogs
class Blog(ndb.Model):
    name = ndb.StringProperty()        # ori

# Blog Post Image
class BlogPostImage(ndb.Model):
    url = ndb.StringProperty()        # ori
    small_url = ndb.StringProperty()  # 250
    medium_url = ndb.StringProperty() # 500
    caption = ndb.TextProperty() # 500

# Blog post entity
class BlogPost(ndb.Model):
    link_url = ndb.StringProperty()
    post_url = ndb.StringProperty()
    blog_name = ndb.StringProperty(indexed=True)
    caption = ndb.TextProperty()
    photos = ndb.StructuredProperty(BlogPostImage, repeated=True)


# Get blog likes and add them to queue
class ProcessBlogLikes(webapp2.RequestHandler):
    def get(self):
        posts_saved = 0
        api_key = self.request.get("api_key")
        blog_name = self.request.get("blog_name")
        offset = int(self.request.get("offset"))

        url = 'http://api.tumblr.com/v2/blog/%s/likes?api_key=%s&limit=20&offset=%d' % (blog_name, api_key, offset)

        result = urlfetch.fetch(url)
        if result.status_code == 200:
            response = json.loads(result.content)
            liked_posts = response['response']['liked_posts']
            for post in liked_posts:
                # only process photos
                if post['type'] != 'photo':
                    continue

                posts_saved = posts_saved + self.save_post(post)

        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps({'posts_saved': posts_saved}))

    def save_post(self, post):

        # save blog
        blog_key = ndb.Key('Blog', post['blog_name'])
        blog = blog_key.get()
        if not blog:
            blog = Blog()
            blog.name = post['blog_name']
            blog.key = blog_key
            blog.put()

        # find post in DB. If not found save
        post_key = ndb.Key('BlogPost', post['id'])
        blog_post = post_key.get()
        if not blog_post:
            blog_post = BlogPost()
            blog_post.blog_name = post['blog_name']
            blog_post.key = post_key
            blog_post.link_url = post.get('link_url', '')
            blog_post.post_url = post.get('post_url', '')
            blog_post.caption = post.get('caption', '')

            # save photos
            photos = post.get('photos', [])
            post_photos = []
            for photo in photos:
                blog_photo = BlogPostImage()
                blog_photo.url = photo['original_size']['url']
                blog_photo.caption = photo.get('caption', '')
                for size in photo['alt_sizes']:
                    if size['width'] == 250:
                        blog_photo.small_url = size['url']
                    if size['width'] == 500:
                        blog_photo.medium_url = size['url']
                post_photos.append(blog_photo)
            blog_post.photos = post_photos
            blog_post.put()
            return 1

        return 0

# Retrieve the list of available blogs
class GetBlogList(webapp2.RequestHandler):

    def get(self):

        blog_names = Blog.query()
        response = []
        for blog in blog_names:
            response.append(blog.name)

        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps({'blogs': response}))

# Retrieve posts for a blog
class GetBlogPosts(webapp2.RequestHandler):
    def get(self):
        blog_name = self.request.get('blog_name')

        response = self.get_posts(blog_name)

        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps({'posts': response, 'name': blog_name}))

    def get_posts(self, blog_name):
        blog_posts = BlogPost.query(BlogPost.blog_name == blog_name).order(-BlogPost.key)
        response = []
        for post in blog_posts:
            new_post = {
                'blog_name': post.blog_name,
                'link_url': post.link_url,
                'post_url': post.post_url,
                'caption': post.caption,
                'photos': []
            }
            for photo in post.photos:
                new_post['photos'].append(
                    {
                        'url': photo.url,
                        'small_url': photo.small_url,
                        'medium_url': photo.medium_url,
                        'caption': photo.caption,
                    }
                )
            response.append(new_post)
        return response


# Retrieve posts for a blog
class GetBlogPostsHtml(GetBlogPosts):
    def get(self):
        blog_name = self.request.get('blog_name')

        response = {'name': blog_name, 'posts': self.get_posts(blog_name)}

        self.response.headers['Content-Type'] = 'text/html'
        template = JINJA_ENVIRONMENT.get_template('post-images.html')

        self.response.write(template.render(response))


class MainPage(webapp2.RequestHandler):

    def get(self):
        self.response.headers['Content-Type'] = 'text/html'

        template_values = []

        template = JINJA_ENVIRONMENT.get_template('index.html')
        self.response.write(template.render(template_values))

application = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/blogs', GetBlogList),
    ('/posts', GetBlogPosts),
    ('/postshtml', GetBlogPostsHtml),
    ('/process', ProcessBlogLikes),
], debug=True)
