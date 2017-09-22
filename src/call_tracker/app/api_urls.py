from django.conf.urls import include, url

from call_tracker.app.graphs import api_urls as graphs_api_urls


urlpatterns = [
    url(r'^graphs/', include(graphs_api_urls)),
]
