from django.shortcuts import render
from django.views.generic.base import View


class GraphView(View):
    def get(self, request):
        return render(request, 'graph.html')
