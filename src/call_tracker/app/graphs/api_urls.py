from django.conf.urls import url

from . import api_views


urlpatterns = [
    url(r'^(?P<graph_id>[^/]+)/artifacts/$', api_views.GraphArtifactsView.as_view()),
    url(r'^(?P<graph_id>[^/]+)/process_runs/$', api_views.GraphProcessRunsView.as_view()),
    url(r'^(?P<graph_id>[^/]+)/processes/$', api_views.GraphProcessesView.as_view()),
    url(r'^(?P<graph_id>[^/]+)/processes/(?P<id>[^/]+)/$', api_views.GraphProcessView.as_view()),
    url(r'^(?P<graph_id>[^/]+)/status/$', api_views.GraphDetailView.as_view()),
    url(r'^(?P<graph_id>[^/]+)/runs/$', api_views.ListGraphRunsView.as_view(), name='graph-runs-list'),
    url(r'^(?P<graph_id>[^/]+)/$', api_views.GraphProcessGraphView.as_view()),
    url(r'^$', api_views.ListGraphView.as_view(), name='graph-list'),
]
