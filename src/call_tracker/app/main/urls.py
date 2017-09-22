from django.conf.urls import patterns, url

from . import views


urlpatterns = patterns('',
    url(r'^', views.GraphView.as_view()),
)
