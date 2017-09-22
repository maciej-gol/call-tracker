from django.conf.urls import patterns, include, url
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    url(r'^admin/', include(admin.site.urls)),
)

urlpatterns += staticfiles_urlpatterns()

urlpatterns += patterns('',
    url(r'^api/', include('call_tracker.app.api_urls', namespace='api')),
    url(r'^', include('call_tracker.app.main.urls')),
)
