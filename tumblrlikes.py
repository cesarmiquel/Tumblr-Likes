import os
import urllib
import json
import pprint

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
    name  = ndb.StringProperty()        # ori
    url   = ndb.StringProperty()
    title = ndb.StringProperty()
    posts = ndb.IntegerProperty()

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
        updated_blogs = {}
        posts_saved = 0
        self.api_key = self.request.get("api_key")
        blog_name = self.request.get("blog_name")
        offset = int(self.request.get("offset"))

        url = 'http://api.tumblr.com/v2/blog/%s/likes?api_key=%s&limit=20&offset=%d' % (blog_name, self.api_key, offset)

        result = urlfetch.fetch(url)
        if result.status_code == 200:
            response = json.loads(result.content)
            liked_posts = response['response']['liked_posts']
            for post in liked_posts:
                # only process photos
                if post['type'] != 'photo':
                    continue

                posts_saved = posts_saved + self.save_post(post)
                if post['blog_name'] not in updated_blogs:
                    updated_blogs[post['blog_name']] = 1

            # Update number of posts
            for blog_name in updated_blogs:
                num_posts = BlogPost.query(BlogPost.blog_name == blog_name).count()
                blog_key = ndb.Key('Blog', blog_name)
                blog = blog_key.get()
                blog.posts = num_posts
                blog.put()
                print "Found %d posts in %s" % (num_posts, blog_name)

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
            blog.posts = 0
            blog.url = blog.name + '.tumblr.com'

            url = 'http://api.tumblr.com/v2/blog/%s.tumblr.com/info?api_key=%s' % (blog.name, self.api_key)
            result = urlfetch.fetch(url)
            if result.status_code == 200:
                blog_info = json.loads(result.content)
                # save blog
                blog.title = blog_info['response']['blog']['title']
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

# Update blog stats and information
class UpdateBlogInfo(webapp2.RequestHandler):
    def get(self):
        posts_processed = 0
        api_key = self.request.get("api_key")
        blog_name = self.request.get("blog_name")
        offset = int(self.request.get("offset"))

        options = ndb.QueryOptions(offset=offset, limit=20)
        blog_names = Blog.query(default_options=options)
        response = []
        for blog in blog_names:
            if blog.title == None:
                url = 'http://api.tumblr.com/v2/blog/%s.tumblr.com/info?api_key=%s' % (blog.name, api_key)
                result = urlfetch.fetch(url)
                if result.status_code == 200:
                    blog_info = json.loads(result.content)

                    # count how many posts we have
                    num_posts = BlogPost.query(BlogPost.blog_name == blog.name).count()

                    # save blog
                    blog.title = blog_info['response']['blog']['title']
                    blog.url = blog.name + '.tumblr.com'
                    blog.posts = num_posts
                    blog.put()

                    response.append({'name': blog.name, 'title': blog_info['response']['blog']['title'], 'url': blog.name + '.tumblr.com', 'posts': num_posts})
                    posts_processed += 1

        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps({'posts_processed': posts_processed, 'blogs':response}))

# Retrieve the list of available blogs
class GetBlogList(webapp2.RequestHandler):

    def get(self):

        blog_names = Blog.query()
        response = []
        for blog in blog_names:
            response.append({'name': blog.name, 'title': blog.title, 'posts': blog.posts, 'url': blog.url})

        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps({'blogs': response}))

# Retrieve posts for a blog
class GetBlogPosts(webapp2.RequestHandler):
    def get(self):
        blog_name = self.request.get('blog_name')
        cursor  = self.request.get('cursor')
        page  = self.request.get('page')

        if page == '':
            page = '0'

        response = self.get_posts(blog_name, cursor, int(page))

        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps({'posts': response['posts'], 'name': blog_name, 'cursor': response['cursor'], 'more': response['more']}))

    def get_posts(self, blog_name, cursor = '', page = 0):
        page_size = 30
        curs = ndb.Cursor(urlsafe = cursor)
        #if blog_name != '':
        #    blog_posts, next_cursor, more = BlogPost.query(BlogPost.blog_name == blog_name).order(-BlogPost.key).fetch_page(page_size, start_cursor = curs)
        #else:
        #    blog_posts, next_cursor, more = BlogPost.query().order(-BlogPost.key).fetch_page(page_size, start_cursor = curs)
        qo = ndb.QueryOptions(offset = page * page_size)
        blog_posts, next_cursor, more = BlogPost.query().order(-BlogPost.key).fetch_page(page_size, start_cursor = curs, options=qo)

        response = {'posts': [], 'cursor': '', 'more': more}
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
            response['posts'].append(new_post)

        if next_cursor != None:
            response['cursor'] = next_cursor.urlsafe()
        else:
            response['cursor'] = ''

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
    ('/updatestats', UpdateBlogInfo),
], debug=True)
